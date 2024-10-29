import { Command } from "commander";
import dotenv from "dotenv";
import { Address, Provider, Wallet, AssetId, createAssetId } from "fuels";
import fs from "fs";
import { Mytoken, MytokenFactory } from "./contract-types";

dotenv.config();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const program = new Command();

program.version("1.0.0").description("A Fuel Token CLI Operator");

enum Network {
  MAINNET = "mainnet",
  TESTNET = "testnet",
}

const transactionLink = (txId: string) => {
  return `https://${
    process.env.NETWORK === Network.MAINNET ? "app" : "app-testnet"
  }.fuel.network/tx/${txId}`;
};

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
  console.table(
    balances.balances.map((balance) => ({
      assetId: balance.assetId,
      amount: balance.amount.toNumber(),
    }))
  );

  if (balances.balances.length == 0) {
    console.log("need faucet : https://faucet-testnet.fuel.network/ ");
    console.log(`faucet address : ${wallet.address.toAddress()}`);
  }
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

    console.log("transfer tx transactionId: ", transactionLink(tx.id));
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
  await sleep(1500);

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
  console.log(`constructor tx transactionId`, transactionLink(transactionId));
  await sleep(1500);

  const assetId = createAssetId(contractId, default_sub_id);

  const update_symbol = await mytoken.functions
    .set_symbol(assetId, "CREATOR")
    .call();
  console.log(
    `update_symbol tx transactionId`,
    transactionLink(update_symbol.transactionId)
  );

  await update_symbol.waitForResult();
  await sleep(1500);

  const set_decimals_tx = await mytoken.functions
    .set_decimals(assetId, 9)
    .call();

  await set_decimals_tx.waitForResult();
  console.log(
    `set_decimals tx transactionId`,
    transactionLink(set_decimals_tx.transactionId)
  );
  await sleep(1500);

  const set_name_tx = await mytoken.functions
    .set_name(assetId, "CREATOR")
    .call();

  await set_name_tx.waitForResult();

  console.log(
    `set_name tx transactionId`,
    transactionLink(set_name_tx.transactionId)
  );
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
        "10000000000"
      )
      .call();
    console.log(`mint tx transactionId`, transactionLink(transactionId));
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
