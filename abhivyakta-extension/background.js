chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'toggle-isl') return;
  const { enabled = true } = await chrome.storage.local.get('enabled');
  await chrome.storage.local.set({ enabled: !enabled });
});
