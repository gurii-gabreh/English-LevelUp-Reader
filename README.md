# English LevelUp Reader

日常会話レベルから徐々にレベルアップしていく英語読解・リスニング・発音練習アプリ。
日本語と英文を混ぜて表示し、読み上げ(TTS)と発音チェック(音声認識)機能を持つ。

## ステータス

現在、本実装前の準備段階です。詳細は
[`progress-tracker-dashboard`](https://github.com/gurii-gabreh/progress-tracker-dashboard) の
タスク `ELR-001` を参照してください。

- [x] 要件定義(マネージャールームで確定)
- [ ] 発音チェック方式(ブラウザ内Whisper/WASM)の試作・精度検証 ← 現在ここ。[`prototype/`](./prototype) 参照
- [ ] 10段階のレベル設計の確認
- [ ] 各レベルのコンテンツ作成
- [ ] アプリ本体の実装
- [ ] 動作確認・公開

## 確定している技術方針

- **読み上げ(TTS)**: ブラウザ標準 `SpeechSynthesis` API(無料・APIキー不要)
- **発音チェック**: ブラウザ内でWhisper系モデルをWebAssemblyで動かす方式(クラウドAPI不使用)。
  理由は姉妹アプリ `English-Speaking-App` の `webkitSpeechRecognition` でiPhone Safariの認識精度が
  悪かったため。詳細は [`prototype/README.md`](./prototype/README.md) 参照。
- **対応端末**: 今回はPC専用(ユーザーが明示的に選択した今回限りの例外)
- **コンテンツ管理**: `data/lessons.json`(正)+ `localStorage`(進捗・スコアなどユーザー個別データ、GitHubには同期しない)
- **ホスティング**: GitHub Pages(バックエンドサーバーなし)
