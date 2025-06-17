// /home/alxfed/2025/Webmachines/Reasoning/gemini/assets/js/machina.js
function runMachine() {
  return new Promise((resolve, reject) => { // Wrap in a Promise
    const currentDialogueWrapper = document.getElementById('dialogue-content-wrapper');
    if (!currentDialogueWrapper) {
      const errorMsg = 'LLM Interaction: dialogue-content-wrapper not found.';
      console.error(errorMsg);
      alert('Error: Could not find the dialogue content to send.');
      reject(new Error(errorMsg)); // Reject the promise
      return;
    }
    
    const htmlContent = currentDialogueWrapper.innerHTML;
    if (!htmlContent || htmlContent.trim() === '') {
      const infoMsg = 'LLM Interaction: Dialogue content is empty. Nothing to send.';
      console.log(infoMsg);
      alert('Dialogue is empty. Please add some content first.');
      reject(new Error(infoMsg)); // Reject the promise
      return;
    }
    
    console.log('Preparing to send dialogue to LLM worker...');
    
    try {
      const cmjMessages = platoHtmlToCmj(htmlContent);
      const mpujMessages = platoHtmlToMpuj(htmlContent);
      
      if (!window.machineConfig || !window.machineConfig.work || !window.machineConfig.name) {
        const errorMsg = "LLM Interaction: machineConfig is not properly set up (missing work or name).";
        console.error(errorMsg);
        alert("Error: LLM configuration is incomplete.");
        reject(new Error(errorMsg)); // Reject the promise
        return;
      }
      
      const userQueryParameters = {
        config: window.machineConfig,
        settings: window.llmSettings,
        messages: mpujMessages
      };
      
      console.log('LLM Interaction: Launching LLM worker with MPUJ messages:', userQueryParameters);
      const llmWorker = new Worker(window.machineConfig.work);
      
      llmWorker.onmessage = function (e) {
        console.log('Main thread: Message received from worker:', e.data);
        if (e.data.type === 'success') {
          console.log('Worker task successful. LLM Response:', e.data.data);
          try {
            const llmResponseData = e.data.data;
            if (!llmResponseData || !llmResponseData.content || !llmResponseData.content.parts) {
              const errorMsg = 'LLM response is missing essential content.';
              console.error(errorMsg);
              alert('Received an incomplete or invalid response from the LLM.');
              reject(new Error(errorMsg)); // Reject on processing error
              return;
            }
            
            const responseContent = llmResponseData.content.parts;
            const regularText = responseContent
              .filter(part => !part.hasOwnProperty('thought'))
              .map(part => part.text)
              .join(' ');
            const desoupedText = llmSoupToText(regularText);
            
            const thoughtsText = responseContent
              .filter(part => part.hasOwnProperty('thought') && part.thought)
              .map(part => part.text)
              .join(' ');
            const desoupedThoughts = llmSoupToText(thoughtsText);
            
            const newCmjMessage = {
              role: 'assistant',
              name: window.machineConfig.name,
              content: desoupedText
            };
            
            cmjMessages.push(newCmjMessage);
            const updatedPlatoText = CmjToPlatoText(cmjMessages);
            
            if (typeof updatedPlatoText !== 'string') {
              const errorMsg = 'Failed to convert updated CMJ to PlatoText.';
              console.error(errorMsg);
              alert('Error processing the LLM response for display.');
              reject(new Error(errorMsg)); // Reject on processing error
              return;
            }
            
            // If the model did not respond with one of the utterances symbolizing 'pass'
            const passUtterances = ['...', 'silence', 'pass'];
            if (desoupedText && desoupedText.trim() !== '' &&
              !passUtterances.includes(desoupedText.trim().toLowerCase())) {
              localStorage.setItem('multilogue', updatedPlatoText);
            }
            if (desoupedThoughts && desoupedThoughts.trim() !== '') {
              localStorage.setItem('thoughts', desoupedThoughts);
            }
            resolve(); // Resolve the promise on success
          } catch (processingError) {
            console.error('Error processing LLM response:', processingError);
            alert('An error occurred while processing the LLM response: ' + processingError.message);
            reject(processingError); // Reject on processing error
          }
        } else if (e.data.type === 'error') {
          console.error('Main thread: Error message from worker:', e.data.error);
          alert('Worker reported an error: ' + e.data.error);
          reject(new Error(e.data.error)); // Reject on worker error
        }
        llmWorker.terminate(); // Terminate worker after processing
      };
      
      llmWorker.onerror = function (error) {
        console.error('Main thread: An error occurred with the worker script:', error.message, error);
        alert('Failed to initialize or run worker: ' + error.message);
        reject(error); // Reject on worker initialization error
        llmWorker.terminate(); // Terminate worker on error
      };
      
      llmWorker.postMessage(userQueryParameters);
      console.log('Main thread: Worker launched and messages sent.');
      
    } catch (e) {
      console.error('LLM Interaction: Failed to process dialogue or communicate with the worker:', e);
      alert('Error preparing data for LLM: ' + e.message);
      reject(e); // Reject on setup error
    }
  });
}