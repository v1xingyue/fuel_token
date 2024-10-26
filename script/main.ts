import { Command } from "commander";
import dotenv from "dotenv";
import { Address, Provider, Wallet, AssetId, createAssetId } from "fuels";
import fs from "fs";
import { Mytoken, MytokenFactory } from "./contract-types";

dotenv.config();

const program = new Command();

program
  .version("1.0.0")
  .description("A Fuel Token CLI Operator")
  .option(
    "--network <type>",
    "specify your network [mainnet, testnet]",
    "testnet"
  );

enum Network {
  MAINNET = "mainnet",
  TESTNET = "testnet",
}

const useBasic = () => {};

const default_sub_id =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

program.command("init").action(() => {
  const options = program.opts();
  const network = options.network;
  console.log(`init command to .env ,network : ${network}`);
  const account = Wallet.generate();
  console.log(`new account address: ${account.address.toB256()}`);
  const privateKey = account.privateKey;
  // 写入 .env 文件
  if (!fs.existsSync(".env")) {
    fs.writeFileSync(".env", `PRIVATE_KEY=${privateKey}\n`);
    fs.appendFileSync(".env", `NETWORK=${network}`);
  } else {
    console.log(".env file already exists");
  }
});

program.command("info").action(async () => {
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = Wallet.fromPrivateKey(privateKey as string);
  console.log(`wallet address: ${wallet.address.toAddress()}`);
  console.log(`wallet B256 address : ${wallet.address.toB256()}`);
  const network = process.env.NETWORK as Network;
  // https://testnet.fuel.network/v1/graphql
  const provider = await Provider.create(
    `https://${
      network === Network.MAINNET ? "mainnet" : "testnet"
    }.fuel.network/v1/graphql`
  );
  console.log(`provider is : ${provider.toString()}`);

  const balances = await provider.getBalances(wallet.address);
  console.table(balances.balances);

  if (balances.balances.length == 0) {
    console.log("need faucet : https://faucet-testnet.fuel.network/ ");
    console.log(`faucet address : ${wallet.address.toAddress()}`);
  }

  const balance = await provider.getBalance(wallet.address, "0x00");
  console.log(`balance: ${balance}`);
});

program
  .command("transfer")
  .option("--to <to>", "the to address")
  .option("--amount <amount>", "the amount")
  .option(
    "--asset_id <asset_id>",
    "the asset id",
    "0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07"
  )
  .action(async ({ to, amount, asset_id }) => {
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = Wallet.fromPrivateKey(privateKey as string);
    const network = process.env.NETWORK as Network;
    const provider = await Provider.create(
      `https://${
        network === Network.MAINNET ? "mainnet" : "testnet"
      }.fuel.network/v1/graphql`
    );
    wallet.provider = provider;
    const tx = await wallet.transfer(to, amount, asset_id);
    await tx.waitForResult();

    console.log(
      `transfer tx transactionId`,
      `https://app.fuel.network/tx/${tx.id}`
    );
  });

program.command("deploy").action(async () => {
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = Wallet.fromPrivateKey(privateKey as string);
  const network = process.env.NETWORK as Network;
  // https://testnet.fuel.network/v1/graphql
  const provider = await Provider.create(
    `https://${
      network === Network.MAINNET ? "mainnet" : "testnet"
    }.fuel.network/v1/graphql`
  );
  console.log(`provider: ${provider}`);
  wallet.provider = provider;
  const { contractId, waitForResult: waitForDeploy } = await new MytokenFactory(
    wallet
  ).deploy();

  await waitForDeploy();

  console.log(`deployed contractId: mytoken - ${contractId}`);

  const mytoken = new Mytoken(contractId, wallet);
  const { transactionId, waitForResult: waitForConstruct } =
    await mytoken.functions
      .constructor({
        Address: {
          bits: wallet.address.toB256(),
        },
      })
      .call();
  await waitForConstruct();
  console.log(
    `constructor tx transactionId`,
    `https://app.fuel.network/tx/${transactionId}`
  );

  const assetId = createAssetId(contractId, default_sub_id);

  const update_symbol = await mytoken.functions
    .set_symbol(assetId, "CREATOR")
    .call();
  console.log(
    `update_symbol tx transactionId`,
    `https://app.fuel.network/tx/${update_symbol.transactionId}`
  );

  await update_symbol.waitForResult();

  const set_decimals_tx = await mytoken.functions
    .set_decimals(assetId, 18)
    .call();

  console.log(
    `set_decimals tx transactionId`,
    `https://app.fuel.network/tx/${set_decimals_tx.transactionId}`
  );

  mytoken.functions.set_name(assetId, "CREATOR").call();
});

program
  .command("mint")
  .option("--sub_id <sub_id>", "the sub id of the mint", default_sub_id)
  .option("--mytoken_id <mytoken_id>", "the mytoken contract id")
  .action(async ({ sub_id, mytoken_id }) => {
    console.log(`mytoken contract address is : ${mytoken_id}`);
    console.log(`sub_id is : ${sub_id}`);
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = Wallet.fromPrivateKey(privateKey as string);
    const network = process.env.NETWORK as Network;
    const provider = await Provider.create(
      `https://${
        network === Network.MAINNET ? "mainnet" : "testnet"
      }.fuel.network/v1/graphql`
    );
    wallet.provider = provider;
    const mytoken = new Mytoken(Address.fromB256(mytoken_id), wallet);
    // console.log(await mytoken.functions.total_supply().call());
    const { transactionId } = await mytoken.functions
      .mint(
        {
          Address: {
            bits: wallet.address.toB256(),
          },
        },
        sub_id,
        10000
      )
      .call();
    console.log(
      `mint tx transactionId`,
      `https://app.fuel.network/tx/${transactionId}`
    );
  });

// 添加 greet 子命令
program
  .command("greet")
  .description("Greet a user")
  .action(({ network }) => {
    if (network) {
      console.log(`Hello ! Network: ${network}`);
    } else {
      console.log("Hello, World!");
    }
  });

program.parse(process.argv);
