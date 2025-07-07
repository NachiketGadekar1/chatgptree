// --- START OF FILE modules/navigation.js ---

/**
 * Finds the currently visible user prompt that has the active navigation controls.
 * @returns {string|null} The messageId of the active prompt, or null if not found.
 */
function findCurrentActivePromptId() {
    const allNavControls = document.querySelectorAll('.response-navigation, div.text-token-text-secondary:has(> button[aria-label])');
    const navControls = allNavControls.length > 0 ? allNavControls[allNavControls.length - 1] : null;

    if (navControls) {
        const assistantArticle = navControls.closest('article[data-testid^="conversation-turn-"]');
        if (assistantArticle) {
            let precedingElement = assistantArticle.previousElementSibling;
            while (precedingElement) {
                const userPromptElement = precedingElement.querySelector('[data-message-author-role="user"][data-message-id]');
                if (userPromptElement && precedingElement.matches('article[data-testid^="conversation-turn-"]')) {
                    return userPromptElement.dataset.messageId;
                }
                precedingElement = precedingElement.previousElementSibling;
            }
        }
    }

    const allUserPrompts = document.querySelectorAll('[data-message-author-role="user"][data-message-id]');
    if (allUserPrompts.length > 0) {
        return allUserPrompts[allUserPrompts.length - 1].dataset.messageId;
    }
    return null;
}

/**
 * Executes a single navigation step by clicking the < or > buttons.
 * @param {string} parentMessageId The ID of the parent/fork prompt.
 * @param {string} targetChildMessageId The ID of the child prompt we want to display.
 * @returns {Promise<boolean>} True if navigation succeeded, false otherwise.
 */
async function executeNavigationStep(parentMessageId, targetChildMessageId) {
    const parentNode = treeData.nodes.get(parentMessageId);
    if (!parentNode || parentNode.children.length < 2) return true;

    const targetBranchNumber = parentNode.children.indexOf(targetChildMessageId) + 1;
    if (targetBranchNumber === 0) return false;

    let visibleChildElement = parentNode.children.map(id => document.querySelector(`div[data-message-id="${id}"]`)).find(el => el);
    if (!visibleChildElement) return false;

    const childArticle = visibleChildElement.closest('article[data-testid^="conversation-turn-"]');
    const navButton = childArticle?.querySelector('button[aria-label="Next response"], button[aria-label="Previous response"]');
    const navControls = navButton?.parentElement;
    const counterDiv = navControls?.querySelector('.page-indicator, .px-0-5, .tabular-nums');
    if (!counterDiv) return false;

    const [currentBranchNumber] = counterDiv.textContent.split('/').map(Number);
    const clicksNeeded = targetBranchNumber - currentBranchNumber;
    if (clicksNeeded === 0) return true;

    const buttonLabel = clicksNeeded > 0 ? 'Next response' : 'Previous response';
    const buttonToClick = navControls.querySelector(`button[aria-label="${buttonLabel}"]`);
    if (!buttonToClick) return false;

    for (let i = 0; i < Math.abs(clicksNeeded); i++) {
        buttonToClick.click();
        await sleep(200);
    }
    return true;
}

/**
 * Main orchestrator for handling a click on a tree node to navigate the chat.
 * @param {object} targetNode The full data object of the clicked node.
 * @param {number} [maxRetries=1] Maximum number of retries allowed.
 * @param {number} [retryCount=0] Current retry attempt.
 */
async function handleNodeClick(targetNode, maxRetries = 5, retryCount = 0) {
    if (retryCount === 0) {
        showToast("Navigating...", 500, 'info');
        toggleTreeOverlay();
    }

    if (document.querySelector(`div[data-message-id="${targetNode.messageId}"]`)) {
        scrollToPromptById(targetNode.messageId, true);
        return;
    }

    const targetPathResult = findNodeAndPathDfs(treeData, targetNode.messageId);
    const currentPromptId = findCurrentActivePromptId();
    if (!targetPathResult || !currentPromptId) return;

    const targetPath = targetPathResult.path.split('->');
    const currentPathResult = findNodeAndPathDfs(treeData, currentPromptId);
    const currentPath = currentPathResult ? currentPathResult.path.split('->') : [currentPromptId];
    
    let forkIndex = -1;
    while (forkIndex + 1 < currentPath.length && forkIndex + 1 < targetPath.length && currentPath[forkIndex + 1] === targetPath[forkIndex + 1]) {
        forkIndex++;
    }
    const forkPointId = currentPath[forkIndex];
    const navigationSteps = targetPath.slice(forkIndex + 1);

    if (navigationSteps.length > 0) {
        let parentForStep = forkPointId;
        for (const step of navigationSteps) {
            if (!scrollToPromptById(parentForStep, false)) {
                if (retryCount < maxRetries) { await sleep(750); handleNodeClick(targetNode, maxRetries, retryCount + 1); }
                return;
            }
            await sleep(250);
            if (!await executeNavigationStep(parentForStep, step)) {
                if (retryCount < maxRetries) { await sleep(750); handleNodeClick(targetNode, maxRetries, retryCount + 1); }
                return;
            }
            if (document.querySelector(`div[data-message-id="${targetNode.messageId}"]`)) {
                await sleep(100);
                scrollToPromptById(targetNode.messageId, true);
                return;
            }
            parentForStep = step;
        }
    }

    if (!scrollToPromptById(targetNode.messageId, true) && retryCount < maxRetries) {
        await sleep(750);
        handleNodeClick(targetNode, maxRetries, retryCount + 1);
    }
}
// --- END OF FILE modules/navigation.js ---