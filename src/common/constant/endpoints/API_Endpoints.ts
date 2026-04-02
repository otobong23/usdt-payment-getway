
export const TronGridBaseUrl = 'https://api.trongrid.io';

export const TronPollingEndpoints = {
   // walletsolidity endpoints
   getConfirmedNowBlock: '/walletsolidity/getnowblock', // Get the latest confirmed block information - GET Request
   getConfirmedBlockByNum: '/walletsolidity/getblockbynum', // Get block confirmed information by block number - POST Request with JSON body { "num": blockNumber }

   // wallet endpoints
   getNowBlock: '/wallet/getnowblock', // Get the latest block information - GET Request
   getBlockByNum: '/wallet/getblockbynum', // Get block information by block number - POST Request with JSON body { "num": blockNumber }
}

//walletsolidity endpoints are used to get already confirmed blocks and transactions
// wallet endpoints are used to get unconfirmed transactions and blocks