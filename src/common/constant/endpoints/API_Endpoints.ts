
export const TronGridBaseUrl = 'https://api.trongrid.io';

export const TronPollingEndpoints = {
   getNowBlock: '/walletsolidity/getnowblock', // Get the latest block information - GET Request
   getBlockByNum: '/walletsolidity/getblockbynum', // Get block information by block number - POST Request with JSON body { "num": blockNumber }

}

//walletsolidity endpoints are used to get already confirmed blocks and transactions
// wallet endpoints are used to get unconfirmed transactions and blocks