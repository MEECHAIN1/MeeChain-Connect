class MeeChainWeb3 {
  constructor(rpcUrl, contracts = {}) {
    this.rpcUrl = rpcUrl;
    this.contracts = contracts;
    this.connected = false;
  }

  async connect() {
    try {
      this.connected = true;
      return true;
    } catch (error) {
      this.connected = false;
      return false;
    }
  }
}

module.exports = { MeeChainWeb3 };
