# Personal Portfolio

シンプルな個人プロフィール・ポートフォリオサイトです。

## ローカルで確認する

`index.html` をブラウザで開いてください。編集には Visual Studio Code などを使えます。

## 最初に変更する場所

- `index.html` の `YOUR NAME` を表示名に変更
- About の自己紹介・プロフィール項目を変更
- Works に自分の制作物を追加
- Contact に公開してよい連絡先やSNSだけを追加

## GitHub Pages で公開する

1. GitHubで新しいPublicリポジトリを作成する（例: `my-portfolio`）。
2. このフォルダ内のファイルをリポジトリの直下にアップロードする。
3. GitHubのリポジトリで Settings → Pages を開く。
4. Build and deployment の Source を `Deploy from a branch` にする。
5. Branch を `main`、フォルダを `/(root)` にして Save。
6. 公開URLが表示されるまで少し待つ。

## Gitで更新する

リポジトリをPCにcloneした場合、変更後に次を実行します。

```bash
git add .
git commit -m "Update portfolio"
git push
```

公開サイトへの反映には通常少し時間がかかります。
