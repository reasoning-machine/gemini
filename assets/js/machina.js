function runMachine() {
  const currentDialogueWrapper = document.getElementById('dialogue-content-wrapper');
  if (!currentDialogueWrapper) {
    console.error('LLM Interaction: dialogue-content-wrapper not found.');
    alert('Error: Could not find the dialogue content to send.');
    return;
  }
  
  const htmlContent = currentDialogueWrapper.innerHTML;
  if (!htmlContent || htmlContent.trim() === '') {
    console.log('LLM Interaction: Dialogue content is empty. Nothing to send.');
    alert('Dialogue is empty. Please add some content first.');
    return;
  }
  
  console.log('Preparing to send dialogue to LLM worker...');
  
  try {
    // Ensure platoHtmlToCmj, platoHtmlToMpuj, llmSoupToText, CmjToPlatoText are globally available
    // or passed/accessible to this function.
    const cmjMessages = platoHtmlToCmj(htmlContent);
    const mpujMessages = platoHtmlToMpuj(htmlContent);
    
    // Ensure window.machineConfig and window.llmSettings are populated
    if (!window.machineConfig || !window.machineConfig.work || !window.machineConfig.name) {
      console.error("LLM Interaction: machineConfig is not properly set up (missing work or name).");
      alert("Error: LLM configuration is incomplete.");
      return;
    }
    
    const userQueryParameters = {
      config: window.machineConfig,
      settings: window.llmSettings,
      messages: mpujMessages
    };
    
    console.log('LLM Interaction: Launching LLM worker with MPUJ messages:', userQueryParameters);
    const llmWorker = new Worker(window.machineConfig.work); // Use path from machineConfig
    
    llmWorker.onmessage = function (e) {
      console.log('Main thread: Message received from worker:', e.data);
      if (e.data.type === 'success') {
        console.log('Worker task successful. LLM Response:', e.data.data);
        try {
          const llmResponseData = e.data.data;
          if (!llmResponseData || !llmResponseData.content || !llmResponseData.content.parts) {
            console.error('LLM response is missing essential content.');
            alert('Received an incomplete or invalid response from the LLM.');
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
            name: window.machineConfig.name, // Use name from machineConfig
            content: desoupedText
          };
          
          cmjMessages.push(newCmjMessage);
          const updatedPlatoText = CmjToPlatoText(cmjMessages);
          
          if (typeof updatedPlatoText !== 'string') {
            console.error('Failed to convert updated CMJ to PlatoText.');
            alert('Error processing the LLM response for display.');
            return;
          }
          
          // List of utterances that Language Model responds with if it passes.
          const passUtterances = ['...', 'silence', 'pass']
          // only if the Language Models didn't pass and responded with text
          if (updatedPlatoText && updatedPlatoText.trim() !== '' &&
            !passUtterances.includes(updatedPlatoText.trim().toLowerCase()) ) {
            localStorage.setItem('multilogue', updatedPlatoText);
            // only if the thoughts are not empty
            if (desoupedThoughts && desoupedThoughts.trim() !== '') {
              localStorage.setItem('thoughts', desoupedThoughts);
              console.log('Worker task successful. LLM Response processed. Thoughts stored.');
              const thoughtsPageUrl = 'thoughts.html';
              let thoughtsTab = window.open('', 'geminiThoughtsTab');
              
              if (!thoughtsTab || thoughtsTab.closed) {
                console.log('Thoughts tab not found or closed, opening new one.');
                thoughtsTab = window.open(thoughtsPageUrl, 'geminiThoughtsTab');
              } else {
                let needsNavigation = false;
                try {
                  if (thoughtsTab.location.href === 'about:blank' || !thoughtsTab.location.pathname.endsWith(thoughtsPageUrl)) {
                    needsNavigation = true;
                  }
                } catch (ex) {
                  console.warn('Could not access thoughtsTab.location, assuming navigation is needed.');
                  needsNavigation = true;
                }
                
                if (needsNavigation) {
                  console.log(`Thoughts tab needs navigation. Attempting to set to ${thoughtsPageUrl}`);
                  try {
                    thoughtsTab.location.href = thoughtsPageUrl;
                  } catch (navError) {
                    console.error('Failed to navigate existing thoughts tab, trying to reopen:', navError);
                    thoughtsTab = window.open(thoughtsPageUrl, 'geminiThoughtsTab');
                  }
                } else {
                  console.log('Thoughts tab already open and on the correct page.');
                }
              }
            }
          }
        } catch (processingError) {
          console.error('Error processing LLM response:', processingError);
          alert('An error occurred while processing the LLM response: ' + processingError.message);
        }
      } else if (e.data.type === 'error') {
        console.error('Main thread: Error message from worker:', e.data.error);
        alert('Worker reported an error: ' + e.data.error);
      }
    };
    
    llmWorker.onerror = function (error) {
      console.error('Main thread: An error occurred with the worker script:', error.message, error);
      alert('Failed to initialize or run worker: ' + error.message);
    };
    
    llmWorker.postMessage(userQueryParameters);
    console.log('Main thread: Worker launched and messages sent.');
    
  } catch (e) {
    console.error('LLM Interaction: Failed to process dialogue or communicate with the worker:', e);
    alert('Error preparing data for LLM: ' + e.message);
  }
}