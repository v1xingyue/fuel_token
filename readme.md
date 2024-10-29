# Token CLI

## build 合约 ， 编译 types

```bash
pnpm types:contract
```

## 初始化账户

```bash
ts-node script/main.ts init
```

初始化后，会在当前目录生成 .env 文件，里面包含账户的私钥，可以供后续使用。同时， 新账户 余额为0 ，需要 Faucet 操作。

## 部署和设置Token 基本信息

```bash
ts-node script/main.ts deploy
```

可按需修改 script/main.ts 中 的 deploy 函数，修改合约初始化时的参数。

## mint 操作

```bash
ts-node script/main.ts mint --mytoken_id $my_token_id
```

其中 mytoken_id 为 部署时返回的合约地址。

默认向当前地址 mint 10000000000 个 token，可按需修改。
