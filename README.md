# puppeteer-video-converter

Google Chrome の開発者ツールのレコーダー機能を使用して得られる JSON ファイルを動画に変換するツールです。

## 使い方

### 1. JSON ファイルの作成

Google Chrome の開発者ツールを開き、レコーダー機能を使用して操作を記録します。

記録が完了したら、「エクスポート」ボタンをクリックして JSON ファイルを保存します。

### 2. JSON ファイルの変換

以下のコマンドを実行して JSON ファイルを動画に変換します。

```sh
npm start {/path/to/record.json}
```

JSON ファイルのあるディレクトリを指定して、複数の JSON ファイルを一括で変換することもできます。

```sh
npm start {/path/to/directory}
```

### 3. その他のオプション

その他のオプションは以下のコマンドで確認することができます。

```sh
npm run help
```
