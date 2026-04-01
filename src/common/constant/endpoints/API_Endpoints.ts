
export const TronGridBaseUrl = 'https://api.shasta.trongrid.io';

export const TronPollingEndpoints = {
   getNowBlock: '/walletsolidity/getnowblock', // Get the latest block information - GET Request
   getBlockByNum: '/walletsolidity/getblockbynum', // Get block information by block number - POST Request with JSON body { "num": blockNumber }

}