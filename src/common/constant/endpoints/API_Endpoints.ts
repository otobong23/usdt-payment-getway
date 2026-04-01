
const TronGridBaseUrl = 'https://api.shasta.trongrid.io';
const setTronGridUrl = (endpoint: string) => `${TronGridBaseUrl+endpoint}`;
export const TronPollingEndpoints = {
   getNowBlock: setTronGridUrl('/walletsolidity/getnowblock'), // Get the latest block information - GET Request
   getBlockByNum: setTronGridUrl('/walletsolidity/getblockbynum'), // Get block information by block number - POST Request with JSON body { "num": blockNumber }

}