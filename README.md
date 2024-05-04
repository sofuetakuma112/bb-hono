これは [`c3`](https://developers.cloudflare.com/pages/get-started/c3) でブートストラップされた [Next.js](https://nextjs.org/) プロジェクトです。

## はじめに

まず、開発用サーバーを起動します：

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
# または
bun dev
```

[http://localhost:3000](http://localhost:3000)をブラウザで開くと結果が表示されます。

## クラウドフレアの統合

上記の `dev` スクリプトに加えて、`c3` はアプリケーションを [Cloudflare Pages](https://pages.cloudflare.com/) 環境と統合するためのスクリプトをいくつか追加しました：
  - `pages:build`は[`@cloudflare/next-on-pages`](https://github.com/cloudflare/next-on-pages) CLIを使ってPages用のアプリケーションをビルドします。
  - [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI を使用して、Pages アプリケーションをローカルでプレビューします。
  - [Wrangler](https://developers.cloudflare.com/workers/wrangler/)CLIを使用してPagesアプリケーションをデプロイします。

> 注意:__ `dev` スクリプトはローカルでの開発に最適ですが、Pages アプリケーションが Pages 環境で正しく動作することを確認するために、(定期的またはデプロイ前に) プレビューする必要があります (詳細については、[`@cloudflare/next-on-pages` 推奨ワークフロー](https://github.com/cloudflare/next-on-pages/blob/05b6256/internal-packages/next-dev/README.md#recommended-workflow) を参照してください)。

### バインディング

Cloudflareの[バインディング](https://developers.cloudflare.com/pages/functions/bindings/)はCloudflare Platformで利用可能なリソースとのやり取りを可能にするものです。

バインディングは開発中、アプリケーションをローカルでプレビューするとき、そしてもちろんデプロイされたアプリケーションで使用できます：

- 開発モードでバインディングを使用するには、`next.config.js` ファイルの `setupDevBindings` で定義する必要があります。このモードでは `next-dev` `@cloudflare/next-on-pages` サブモジュールを使用します。詳細は [documentation](https://github.com/cloudflare/next-on-pages/blob/05b6256/internal-packages/next-dev/README.md) を参照してください。

- プレビューモードでバインディングを使用するには、`wrangler pages dev` コマンドに従って `pages:preview` スクリプトにバインディングを追加する必要があります。詳しくは [documentation](https://developers.cloudflare.com/workers/wrangler/commands/#dev-1) または [Pages Bindings documentation](https://developers.cloudflare.com/pages/functions/bindings/) を参照してください。

- デプロイされたアプリケーションでバインディングを使用するには、Cloudflare [dashboard](https://dash.cloudflare.com/) でバインディングを設定する必要があります。詳細は[Pages Bindings documentation](https://developers.cloudflare.com/pages/functions/bindings/)を参照してください。

#### KV の例

c3`はKVバインディングの使用方法を示す例を追加しました。

例を有効にするには
- 以下のコメントを含むjavascript/typescript行を検索してください：
  以下のコメントを含む javascript/typescript 行を検索してください。
  ```ts
  // KV Example:
  ```
  を含むjavascript/typescript行を検索し、その下にあるコメント行のコメントを外します。
- 同じことを `wrangler.toml` ファイルでも行ってください。
  にも同じことをしてください：
  ```
  # KV Example:
  ```
- TypeScript を使用している場合は、`cf-typegen` スクリプトを実行して `env.d.ts` ファイルを更新する：
  ```bash
  npm run cf-typegen
  # または
  yarn cf-typegen
  # または
  pnpm cf-typegen
  # または
  bun cf-typegen
  ```

これで `dev` スクリプトまたは `preview` スクリプトを実行して、`/api/hello` ルートにアクセスすることで、サンプルが実際に動作するのを見ることができる。

最後に、デプロイしたアプリケーションでサンプルの動作を確認したい場合は、Pages アプリケーションの [dashboard kvinding settings section](https://dash.cloudflare.com/?to=/:account/pages/view/:pages-project/settings/functions#kv_namespace_bindings_section) に `MY_KV_NAMESPACE` バインディングを追加してください。設定後、アプリケーションを再デプロイしてください。
