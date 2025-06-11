document.addEventListener('DOMContentLoaded', () => {
    const thoughtsContainer = document.getElementById('thoughts-content-wrapper');

    if (!thoughtsContainer) {
        console.error('Thoughts display container (thoughts-content-wrapper) not found.');
        return;
    }

    function displayThoughts() {
        try {
            const thoughtsText = localStorage.getItem('thoughts');
            if (thoughtsText && thoughtsText.trim() !== '') {
                thoughtsContainer.textContent = thoughtsText; // Safely sets text content
            } else {
                thoughtsContainer.textContent = 'There were not thoughts.';
            }
        } catch (e) {
            console.error('Error reading or displaying thoughts from localStorage:', e);
            thoughtsContainer.textContent = 'Error loading thoughts.';
        }
    }

    // Function to handle the redirect
    function redirectToMachine() {
        console.log('Thoughts page: Attempting to redirect current tab to machine.html');
        try {
            // Construct an absolute URL for machine.html.
            // This assumes machine.html is in the same directory as thoughts.html.
            // Using new URL() with window.location.href as the base ensures correct resolution.
            const machinePageUrl = new URL('machine.html', window.location.href).href;

            console.log(`Thoughts page: Redirecting current tab to absolute URL: ${machinePageUrl}`);
            window.location.replace(machinePageUrl);
        } catch (e) {
            console.error('Error constructing URL or during window.location.replace:', e);
            // As a last resort, you could try window.location.href, but the "new tab" issue is the primary concern.
            // window.location.href = new URL('machine.html', window.location.href).href;
        }
    }

    // 1. Initial display when the page loads
    displayThoughts();

    // Add a small delay before redirecting.
    console.log('Thoughts page: Scheduling redirect to machine.html in 1 second.');
    setTimeout(redirectToMachine, 1000); // Redirect 1 second after load

    // 2. Listen for storage changes from other tabs/windows
    window.addEventListener('storage', (event) => {
        if (event.key === 'thoughts') {
            console.log('Thoughts page: "thoughts" key changed in localStorage by another tab. Refreshing display.');
            displayThoughts();
            // Redirect again after the content is updated by another tab
            console.log('Thoughts page: Scheduling redirect (after storage update) to machine.html in 1 second.');
            setTimeout(redirectToMachine, 1000); // Redirect 1 second after update
        }
    });

    // 3. Update when tab becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('Thoughts page: Tab became visible, refreshing thoughts display.');
            displayThoughts();
            // No redirect here to avoid redirect loops if the user intentionally navigates back to this tab.
        }
    });
});
