// Shared installation status module
let isInstalled = false;

const getInstallationStatus = () => isInstalled;

const setInstallationStatus = (status) => {
  isInstalled = status;
  console.log('Installation status updated to:', status ? 'INSTALLED' : 'NOT INSTALLED');
};

module.exports = {
  getInstallationStatus,
  setInstallationStatus
};