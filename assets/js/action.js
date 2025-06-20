document.addEventListener('DOMContentLoaded', () => {
  let llmSettings = {};
  const queryParams = new URLSearchParams(window.location.search);
  
  // Iterate over query parameters found in the URL
  for (const [key, value] of queryParams.entries()) {
    // Basic type conversion for known numeric fields
    if (['temperature', 'topP', 'topK'].includes(key)) {
      const numValue = parseFloat(value);
      llmSettings[key] = isNaN(numValue) ? value : numValue;
    } else if (['maxOutputTokens', 'thinkingBudget'].includes(key)) {
      const numValue = parseInt(value, 10);
      llmSettings[key] = isNaN(numValue) ? value : numValue;
    } else if (key === 'includeThoughts') {
      const boolValue = value === 'true';
      llmSettings[key] = boolValue;
    } else {
      llmSettings[key] = value;
    }
  }
  // Make the parameters globally available for other scripts
  window.llmSettings = llmSettings;
  console.log('LLM Settings:', window.llmSettings)
  
  // Check whether the page has the container.
  const contentContainer = document.querySelector('.container-md.markdown-body');
  if (!contentContainer) {
    console.error('Main content container (.container-md.markdown-body) not found.');
    return;
  }
  // Check whether the page has a header.
  const h1Element = contentContainer.querySelector('h1');
  if (!h1Element) {
    console.error('H1 element not found. UI elements might be misplaced.');
  }
  
  // Capture HTML from original static <p class="dialogue"> elements and then hide them.
  const originalStaticDialogueElements = Array.from(contentContainer.querySelectorAll('p.dialogue'));
  let initialHtmlFromStatic = '';
  originalStaticDialogueElements.forEach(p => {
    initialHtmlFromStatic += p.outerHTML;
    p.style.display = 'none';
  });
  
  // 1. Create a wrapper for the dialogue content
  const dialogueWrapper = document.createElement('div');
  dialogueWrapper.id = 'dialogue-content-wrapper';
  
  // 2. Create the textarea for editing
  const textarea = document.createElement('textarea');
  textarea.id = 'dialogue-editor-textarea';
  textarea.className = 'form-control';
  textarea.style.display = 'none';
  
  // 3. Create container and button for file picking
  const filePickerContainer = document.createElement('div');
  filePickerContainer.id = 'file-picker-container';
  filePickerContainer.style.display = 'none';
  
  const chooseFileButton = document.createElement('button');
  chooseFileButton.id = 'chooseFileButton';
  chooseFileButton.className = 'btn btn-primary';
  chooseFileButton.textContent = 'Choose File to Load Dialogue';
  filePickerContainer.appendChild(chooseFileButton);
  
  // 4. Insert dynamic elements into the DOM
  if (h1Element) {
    h1Element.after(dialogueWrapper, textarea, filePickerContainer);
  } else {
    contentContainer.prepend(dialogueWrapper, textarea, filePickerContainer);
  }
  
  // 5. Initialize localStorage
  let platoTextForInit = localStorage.getItem('multilogue');
  if (platoTextForInit === null) {
    if (initialHtmlFromStatic.trim() !== '') {
      try {
        platoTextForInit = platoHtmlToPlatoText(initialHtmlFromStatic);
      } catch (e) {
        console.error("Error converting initial static HTML to Plato text:", e);
        platoTextForInit = '';
      }
    } else {
      platoTextForInit = '';
    }
    localStorage.setItem('multilogue', platoTextForInit);
  }
  
  // --- START: Token Pop-up Helper Functions ---
  function showTokenPopup() {
    const popup = document.getElementById('tokenPopupOverlay');
    const input = document.getElementById('tokenPopupInput');
    if (popup && input) {
      input.value = '';
      popup.style.display = 'flex';
      input.focus();
    } else {
      console.error('Token pop-up elements (tokenPopupOverlay or tokenPopupInput) not found. Ensure HTML is present.');
      alert('Error: Token input dialog is missing. Cannot proceed without a token if fetch fails.');
    }
  }
  
  function hideTokenPopup() {
    const popup = document.getElementById('tokenPopupOverlay');
    if (popup) {
      popup.style.display = 'none';
    }
  }
  // --- END: Token Pop-up Helper Functions ---
  
  // 6. Function to update display based on localStorage content
  function updateDisplayState() {
    const currentPlatoText = localStorage.getItem('multilogue');
    if (currentPlatoText && currentPlatoText.trim() !== '') {
      try {
        dialogueWrapper.innerHTML = platoTextToPlatoHtml(currentPlatoText);
      } catch (e) {
        console.error("Error rendering Plato text to HTML:", e);
        dialogueWrapper.innerHTML = "<p class='dialogue-error'>Error loading content. Please try editing or loading a new file.</p>";
      }
      dialogueWrapper.style.display = 'block';
      textarea.style.display = 'none';
      filePickerContainer.style.display = 'none';
      dialogueWrapper.scrollIntoView({behavior: 'smooth', block: 'end'});
    } else {
      dialogueWrapper.style.display = 'none';
      textarea.style.display = 'none';
      filePickerContainer.style.display = 'flex';
      dialogueWrapper.innerHTML = '';
      textarea.value = '';
    }
  }
  
  updateDisplayState();
  
  // 7. Event listener for "Choose File" button
  chooseFileButton.addEventListener('click', async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Text Files',
          accept: {'text/plain': ['.txt', '.md', '.text', '.plato']},
        }]
      });
      const file = await fileHandle.getFile();
      const fileContent = await file.text();
      localStorage.setItem('multilogue', fileContent);
      textarea.value = fileContent;
      dialogueWrapper.style.display = 'none';
      filePickerContainer.style.display = 'none';
      textarea.style.display = 'block';
      textarea.focus();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error opening file:', err);
        alert(`Error opening file: ${err.message}`);
      }
    }
  });
  
  // 8. Event listener to switch to edit mode
  dialogueWrapper.addEventListener('click', () => {
    try {
      const plainText = localStorage.getItem('multilogue') || '';
      textarea.value = plainText;
      dialogueWrapper.style.display = 'none';
      textarea.style.display = 'block';
      filePickerContainer.style.display = 'none';
      textarea.focus();
    } catch (e) {
      console.error("Error converting HTML to Plato text for editing:", e);
      alert("Could not switch to edit mode due to a content error.");
    }
  });
  
  // 9. Event listener for saving (Ctrl+Enter) in the textarea
  textarea.addEventListener('keydown', (event) => {
    if (event.ctrlKey && !event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      const newText = textarea.value;
      localStorage.setItem('multilogue', newText);
      updateDisplayState();
    }
  });
  
  // 10. Event listener for saving to file (Ctrl+Shift+Enter)
  document.addEventListener('keydown', async (event) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      const textToSave = localStorage.getItem('multilogue') || '';
      if (!textToSave.trim()) {
        alert('Dialogue is empty. Nothing to save.');
        return;
      }
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: 'multilogue.txt',
          types: [{
            description: 'Text Files',
            accept: {'text/plain': ['.txt', '.md', '.text', '.plato']},
          }],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(textToSave);
        await writable.close();
        localStorage.setItem('multilogue', textToSave); // Update localStorage only on successful save
        updateDisplayState();
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error saving file:', err);
          alert(`Could not save file: ${err.message}`);
        }
      }
    }
  });
  
  // --- START: Setup for Token Pop-up Buttons ---
  const tokenPopupSaveButton = document.getElementById('tokenPopupSaveButton');
  if (tokenPopupSaveButton) {
    tokenPopupSaveButton.addEventListener('click', async () => {
      const tokenInputVal = document.getElementById('tokenPopupInput').value;
      if (tokenInputVal && tokenInputVal.trim()) {
        window.llmSettings.token = tokenInputVal.trim();
        console.log('Token set manually via pop-up.');
        hideTokenPopup();
        // Directly attempt to run the machine after setting the token
        if (window.llmSettings.token && window.llmSettings.token.trim() !== '') {
          console.log('Proceeding with LLM interaction after manual token entry.');
          try {
            await runMachine(); // Ensure runMachine is async or handles promises
          } catch (error) {
            console.error('LLM interaction failed (runMachine after manual token):', error.message);
            alert(`LLM interaction failed: ${error.message}`);
          }
        } else {
          // This case should ideally not be hit if the input was validated, but as a fallback:
          console.error('Token still missing after attempting manual entry.');
          alert('Token is still missing. Please provide it.');
          showTokenPopup(); // Re-show pop-up
        }
      } else {
        alert('Please enter an API token.');
      }
    });
  } else {
    console.warn('Token pop-up save button (tokenPopupSaveButton) not found.');
  }
  
  const tokenPopupCancelButton = document.getElementById('tokenPopupCancelButton');
  if (tokenPopupCancelButton) {
    tokenPopupCancelButton.addEventListener('click', () => {
      hideTokenPopup();
      console.log('Token entry cancelled by user.');
    });
  }
  // --- END: Setup for Token Pop-up Buttons ---
  
  // 11. Event listener for LLM communications (Alt+Shift)
  document.addEventListener('keydown', async function (event) {
    if (event.altKey && event.shiftKey) {
      event.preventDefault();
      console.log('Alt+Shift pressed. Attempting to trigger LLM interaction.');
      
      let tokenAvailable = window.llmSettings.token && window.llmSettings.token.trim() !== '';
      
      if (!tokenAvailable) {
        console.log('Token not found or empty. Attempting to fetch from: https://localhost/' + window.machineConfig.token);
        try {
          const tokenResponse = await fetch('https://localhost/' + window.machineConfig.token);
          if (!tokenResponse.ok) {
            let errorDetails = `HTTP error fetching token! Status: ${tokenResponse.status}`;
            try {
              const errorBody = await tokenResponse.text();
              if (errorBody) errorDetails += ` - Body: ${errorBody.substring(0, 200)}`;
            } catch (e) { /* Ignore */ }
            throw new Error(errorDetails);
          }
          const fetchedToken = (await tokenResponse.text()).trim();
          if (!fetchedToken) {
            throw new Error("Fetched token is empty.");
          }
          window.llmSettings.token = fetchedToken;
          tokenAvailable = true; // Token is now available
          console.log('Token fetched successfully from server.');
        } catch (fetchError) {
          console.error('Token fetch failed:', fetchError.message);
          showTokenPopup(); // Show pop-up to ask for token
          return; // Stop further execution in this handler, wait for pop-up interaction
        }
      }
      
      if (tokenAvailable) {
        console.log('Token available. Proceeding with LLM interaction.');
        try {
          await runMachine(); // Ensure runMachine is async or handles promises
        } catch (error) {
          console.error('LLM interaction failed (runMachine):', error.message);
          alert(`LLM interaction failed: ${error.message}`);
        }
      } else {
        // This case should ideally be handled by the fetch error or if popup is already shown
        console.log('Token still not available after fetch attempt. Showing pop-up.');
        showTokenPopup();
      }
    }
  });
  
  // 12 Event listener for remote trigger from Chrome extension
  window.addEventListener('runMachineCommand', async function() {
    console.log('Received runMachineCommand event. Triggering LLM interaction.');
    // Similar logic to Alt+Shift for token checking
    let tokenAvailable = window.llmSettings.token && window.llmSettings.token.trim() !== '';
    
    if (!tokenAvailable) {
      console.log('Token not found for runMachineCommand. Attempting to fetch...');
      try {
        const tokenResponse = await fetch('https://localhost/' + window.machineConfig.token);
        if (!tokenResponse.ok) {
          let errorDetails = `HTTP error fetching token! Status: ${tokenResponse.status}`;
          try {
            const errorBody = await tokenResponse.text();
            if (errorBody) errorDetails += ` - Body: ${errorBody.substring(0, 200)}`;
          } catch (e) { /* Ignore */ }
          throw new Error(errorDetails);
        }
        const fetchedToken = (await tokenResponse.text()).trim();
        if (!fetchedToken) {
          throw new Error("Fetched token is empty for runMachineCommand.");
        }
        window.llmSettings.token = fetchedToken;
        tokenAvailable = true;
        console.log('Token fetched successfully for runMachineCommand.');
      } catch (fetchError) {
        console.error('Token fetch failed for runMachineCommand:', fetchError.message);
        showTokenPopup();
        return;
      }
    }
    
    if (tokenAvailable) {
      console.log('Token available for runMachineCommand. Proceeding.');
      try {
        await runMachine(); // Ensure runMachine is async or handles promises
      } catch (error) {
        console.error('LLM interaction failed (runMachineCommand):', error.message);
        alert(`LLM interaction failed: ${error.message}`);
      }
    } else {
      console.log('Token still not available for runMachineCommand. Showing pop-up.');
      showTokenPopup();
    }
  });
  
  // 13. Update multilogue display from the localStorage
  window.addEventListener('localStorageChanged', function() {
    console.log('Received localStorageChanged event. Triggering multilogue update.');
    updateDisplayState();
  });
  
  // 14. Update display when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (typeof updateDisplayState === 'function') {
        updateDisplayState();
      }
    }
  });
  
  // Add/Update Escape key listener to also close the token pop-up
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const tokenPopup = document.getElementById('tokenPopupOverlay');
      if (tokenPopup && tokenPopup.style.display === 'flex') {
        hideTokenPopup();
      }
    }
  });
});