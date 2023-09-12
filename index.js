solc = require("solc");
 
fs = require("fs");
 
Web3 = require("web3");
 

function Compile(contractFile, jsonFilePath){
  var input = {
    language: "Solidity",
    sources: {
      "simpleToken.sol": {
        content: contractFile,
      },
    },
   
    settings: {
      outputSelection: {
        "*": {
          "*": ["*"],
        },
      },
    },
  };
   
  var output = JSON.parse(solc.compile(JSON.stringify(input)));
  // console.log("Result : ", output);
   
  ABI = output.contracts["simpleToken.sol"]["simpleToken"].abi;
  bytecode = output.contracts["simpleToken.sol"]["simpleToken"].evm.bytecode.object;
  console.log("ABI: ", ABI);

  contractData = {'ABI': ABI, 'ByteCode': bytecode}
  
  try {
    const jsonABI = JSON.stringify(contractData, null, 2);
    fs.writeFileSync(jsonFilePath, jsonABI, 'utf8');
    console.log('ABI has been written to file:', jsonFilePath);
    } catch (error) {
      console.error('Failed to write ABI to file:', error);
    } 
  }



async function deploy(web3, jsonFilePath, privateKey){

  try {
    const fileData = fs.readFileSync(jsonFilePath, 'utf8');
    const compileData = JSON.parse(fileData);
    ABI = compileData['ABI'];
    bytecode = String(compileData['ByteCode']);
   }catch (error) {
    console.error('Failed to read ABI from file:', error);
  }

  const contract = new web3.eth.Contract(ABI);
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);

  // Add the account to the wallet
  web3.eth.accounts.wallet.add(account);
  
  // Set the default account for transactions
  web3.eth.defaultAccount = account.address;

//   Prepare the deployment transaction
  const deployTx = contract.deploy({
    data: bytecode,
    arguments: ['21000000'] // Pass any constructor arguments here
  });

  try {
      const deployer = account.address;
      // Estimate the gas required for the deployment
      const gasEstimate = await deployTx.estimateGas({ from: deployer });
  
      // Send the deployment transaction
      const deployedContract = await deployTx.send({
        from: deployer,
        gas: gasEstimate,
      });
      contractAddress = deployedContract.options.address
      console.log('Contract deployed at address:', contractAddress);
    } catch (error) {
      console.error('Failed to deploy contract:', error);
    }

    deployedData = {'contractAddress': contractAddress};

    try {
        const contractdata = JSON.stringify(deployedData, null, 2);
        // console.log(contractdata)
        fs.writeFileSync('deployedData.json', contractdata, 'utf8');
        console.log('ABI has been written to file: deployedData.json');
        } catch (error) {
          console.error('Failed to write ABI to file:', error);
        } 
    return deployTx
  }



async function transaction(jsonFilePath, web3, address1, address2, deployTx){

    try {
        const fileData = fs.readFileSync(jsonFilePath, 'utf8');
        const data = JSON.parse(fileData);
        ABI = data['ABI'];
        bytecode = String(data['ByteCode']);
       }catch (error) {
        console.error('Failed to read ABI from file:', error);
      }  

  const fileData = fs.readFileSync('deployedData.json', 'utf8');
  const contractdata = JSON.parse(fileData);
  const contractAddress = contractdata["contractAddress"];
  const deployedContract = new web3.eth.Contract(ABI, contractAddress);

  // Send a transaction to a contract function
  const gasEstimate = await deployTx.estimateGas({ from: address1 });
  const toAddress = address2;
  const tokenAmount = 10;

  deployedContract.methods.transfer(toAddress, tokenAmount).send({ from: address1, gas: gasEstimate })
    .then(receipt => {
      console.log('Transaction receipt:', receipt);
    })
    .catch(error => {
      console.error('Error:', error);
    });
}


async function getBalance(jsonFilePath, address2, web3) {

    try {
        const fileData = fs.readFileSync(jsonFilePath, 'utf8');
        const data = JSON.parse(fileData);
        ABI = data['ABI'];
        bytecode = String(data['ByteCode']);
       }catch (error) {
        console.error('Failed to read ABI from file:', error);
      } 

    const fileData = fs.readFileSync('deployedData.json', 'utf8');
    const contractdata = JSON.parse(fileData);
    const contractAddress = contractdata['contractAddress'];

    const contract = new web3.eth.Contract(ABI, contractAddress);

    const addressToCheck = address2; // Replace with the address you want to check
    const balance = await contract.methods.balances(addressToCheck).call();
    console.log(`Balance of ${addressToCheck}: ${balance}`);
}


web3 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545"));

async function executeSequentially(web3) {
    try {
      const jsonFilePath = "contractData.json";
      const file = fs.readFileSync("simpleToken.sol").toString();
      const privateKey = '0xeace222161cf43daaa67cfd7bd2dc316419a13081162fea200c8d06fc71c1a7a';
      const address1 = '0x12BA939ba02A77743485e9B8d95dC520efa4468e';
      const address2 = '0x768899FC437C50Bd98132481bcF755766B1ce3B5';
  
    //   Compile(file, jsonFilePath);
      const deployResult = await deploy(web3, jsonFilePath, privateKey);
      await getBalance(jsonFilePath, address1, web3);
      await getBalance(jsonFilePath, address2, web3);
      await transaction(jsonFilePath, web3, address1, address2, deployResult);
      await new Promise(resolve => setTimeout(resolve, 5000));
      await getBalance(jsonFilePath, address1, web3);
      await getBalance(jsonFilePath, address2, web3);
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  executeSequentially(web3);
