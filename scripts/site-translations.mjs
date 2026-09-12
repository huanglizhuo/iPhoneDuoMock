// Human-readable page copy. Screen dimensions are tool presets, not hardware certification.
const table = (headers, rows) =>
  `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const copy = {
  ja: {
    guideTitle: '折りたたみスマホのモックアップ作成ガイド | Duo Studio',
    specTitle: '画面サイズと書き出し仕様 | Duo Studio',
    heading: 'Duo Studio で折りたたみ端末のモックアップを作る',
    specHeading: 'スクリーンショットのサイズと書き出し仕様',
    description:
      '内外画面のスクリーンショットからモックアップを作成し、Web サイトをプレビュー。PNG・MP4・WebM・GIF をローカルで書き出す手順を紹介します。',
    specDescription:
      'Duo Studio の内外画面の推奨画像サイズ、6 つの姿勢、書き出し形式、解像度とフレームレート。',
    intro:
      'Duo Studio は、アプリのスクリーンショットから折りたたみスマホのモックアップと開閉アニメーションを作る、オープンソースのブラウザツールです。内外画面の画像を追加し、姿勢を選んで、製品紹介用の画像や動画を書き出せます。Web モードでは埋め込みが許可されたサイトを操作できます。画像の処理と書き出しはローカルで完結します。iOS やネイティブアプリを実行するエミュレーターではありません。',
    specIntro:
      '以下は Duo Studio が使用する画像スロットと書き出しプリセットの寸法です。内側横向きは 2853 × 2007、縦向きは 2007 × 2853、外側縦向きは 1398 × 2034、スタンド姿勢の外側横向きは 2034 × 1398 ピクセルです。画像のピクセル数は Web ページの CSS ビューポートとは異なります。これらはツールの設定値であり、実機の仕様や App Store の受理を保証するものではありません。',
    open: 'エディターを開く',
    sizes: ['画面', '使用する姿勢', '推奨ピクセル数', '比率'],
    screenRows: [
      ['内側・横向き', '自由開閉、横向き', '2853 × 2007', '1.42:1'],
      ['内側・縦向き', '縦向き、卓上', '2007 × 2853', '1:1.42'],
      ['外側・縦向き', '閉じた状態', '1398 × 2034', '1:1.45'],
      ['外側・横向き', 'スタンド', '2034 × 1398', '1.45:1'],
    ],
    exports: ['形式', '用途', '解像度・フレームレート'],
    exportRows: [
      [
        'PNG',
        '枠付き静止画。透明背景も選択可能',
        'シーンに合わせたサイズ、1600 × 1000、1080 × 1350、1200 × 1200',
      ],
      [
        'MP4 / WebM',
        'H.264 / VP9 の開閉動画。ブラウザのエンコード対応が必要',
        '30 fps・最長辺 1280 px',
      ],
      ['GIF', '繰り返し再生するアニメーション', '12 fps・最長辺 640 px'],
      ['ZIP', '画像を設定した全シーンの PNG と一覧', '各スロットのサイズ'],
      [
        'UI 原画像 PNG',
        '枠なしのアップロード画像。寸法の厳密な確認',
        'スロットと完全一致する画像が必要',
      ],
    ],
    how: [
      '画像からモックアップを作るには？',
      '<ol><li>「スクリーンショット」で内側画面の画像を追加します。外側画面には別の画像も設定できます。未設定なら内側画像の左半分を利用します。</li><li>「全体を表示」で比率を保持するか、「画面を埋める」で余白をなくします。位置とズームも調整できます。</li><li>自由開閉、閉じた状態、横向き、縦向き、卓上、スタンドから選び、各姿勢に合う画像を設定します。</li><li>開閉スライダーでプレビューし、書き出す形式とサイズを選びます。詳細設定で背景や構図を調整できます。</li></ol>',
    ],
    sizeHeading: 'どのサイズの画像を用意すればよいですか？',
    formatHeading: 'どの形式で書き出せますか？',
    browser: [
      'どんな Web サイトでも表示できますか？',
      '<p>対象サイトが iframe の埋め込みを許可している必要があります。Content-Security-Policy の frame-ancestors や X-Frame-Options による制限は回避できません。ブラウザはサイトへ直接接続します。</p><p>開閉中の内側画面には独立したページを使うため、操作やスクロールが同期しない場合があります。完全に開いて操作を確認してください。書き出すには現在の Duo Studio タブを共有する許可が必要です。各画面をローカルで取得後、共有を終了してファイルを生成します。</p>',
    ],
    privacy: [
      '画像はサーバーに送信されますか？',
      '<p>追加した画像の処理と書き出しはデバイス内で行います。プロジェクトはブラウザに自動保存され、.duo.json として持ち出せます。ファイルには原画像が含まれるため、共有時にはご注意ください。ブラウザデータを消す前にバックアップしてください。Web モードの通信には対象サイトのプライバシーポリシーが適用されます。</p>',
    ],
    limits: [
      '入力とアニメーションの制限は？',
      '<p>画像は PNG・JPEG・WebP、一辺 4096 px、1600 万画素、20 MB まで。アニメーションは 2〜10 秒で、前後に各 0〜2 秒の停止を追加できます。MP4 と WebM の利用可否はブラウザのエンコーダーによって異なります。Web プレビューの CSS ピクセルと出力画像のピクセル数は別の設定です。</p>',
    ],
    attribution: [
      'Apple の公式ツールですか？',
      '<p>Duo Studio は独立したオープンソースプロジェクトで、Apple の製品ではありません。モデル素材の出典とライセンスは公開リポジトリに記載しています。モックアップはアプリの実機対応を証明しません。App Store への提出には最新の要件を確認し、実機でもテストしてください。</p>',
    ],
    source: 'ソースコード・素材の出典・問題報告',
    related: '全サイズと書き出し仕様',
  },
  fr: {
    guideTitle: 'Guide des maquettes de smartphones pliables | Duo Studio',
    specTitle: 'Dimensions des captures et formats d’export | Duo Studio',
    heading: 'Créer une maquette de smartphone pliable avec Duo Studio',
    specHeading: 'Dimensions des captures et spécifications d’export',
    description:
      'Importez vos captures internes et externes, prévisualisez un site intégrable et exportez des images PNG ou des animations MP4, WebM et GIF en local.',
    specDescription:
      'Dimensions recommandées des écrans Duo Studio, six positions, formats d’export, résolutions et fréquences d’images.',
    intro:
      'Duo Studio est un outil open source qui crée des maquettes de smartphones pliables et des animations à partir de captures d’applications, directement dans le navigateur. Importez les écrans internes et externes, choisissez une position et exportez un visuel pour présenter votre produit. Le mode web permet d’explorer les sites qui autorisent leur intégration. Les images et les exports sont traités localement. L’outil n’exécute ni iOS ni votre application native.',
    specIntro:
      'Ces dimensions correspondent aux emplacements d’images et aux préréglages d’export utilisés par Duo Studio : 2853 × 2007 pixels pour l’écran interne en paysage, 2007 × 2853 en portrait, 1398 × 2034 pour l’écran externe en portrait et 2034 × 1398 pour la position debout. Les pixels des images diffèrent de la fenêtre CSS d’une page web. Ce sont des paramètres de l’outil, et non une certification matérielle ou une garantie d’acceptation sur l’App Store.',
    open: 'Ouvrir l’éditeur',
    sizes: ['Écran', 'Position', 'Pixels recommandés', 'Ratio'],
    screenRows: [
      ['Interne · paysage', 'Pliage libre, paysage', '2853 × 2007', '1.42:1'],
      ['Interne · portrait', 'Portrait, assis', '2007 × 2853', '1:1.42'],
      ['Externe · portrait', 'Fermé', '1398 × 2034', '1:1.45'],
      ['Externe · paysage', 'Debout', '2034 × 1398', '1.45:1'],
    ],
    exports: ['Format', 'Usage', 'Résolution et fréquence'],
    exportRows: [
      [
        'PNG',
        'Image avec cadre, fond transparent facultatif',
        'Taille de scène, 1600 × 1000, 1080 × 1350 ou 1200 × 1200',
      ],
      [
        'MP4 / WebM',
        'Animation H.264 / VP9 selon les encodeurs du navigateur',
        '30 i/s · côté maximal 1280 px',
      ],
      ['GIF', 'Animation en boucle', '12 i/s · côté maximal 640 px'],
      ['ZIP', 'PNG des scènes importées et manifeste', 'Dimensions de chaque emplacement'],
      [
        'PNG UI brut',
        'Image originale sans cadre, vérification stricte',
        'Dimensions identiques à l’emplacement requis',
      ],
    ],
    how: [
      'Comment créer une maquette à partir de captures ?',
      '<ol><li>Dans Captures, importez l’image de l’écran interne. Ajoutez une image externe distincte si vous le souhaitez ; sinon, la moitié gauche de l’image interne est utilisée.</li><li>Choisissez Ajuster pour conserver toute l’image, ou Remplir pour couvrir l’écran sans bandes. Réglez le cadrage et le zoom.</li><li>Choisissez Pliage libre, Fermé, Paysage, Portrait, Assis ou Debout, puis attribuez des captures adaptées à chaque orientation.</li><li>Prévisualisez avec le curseur de pliage et choisissez le format et la taille d’export. Le mode Avancé ajoute les réglages de fond et de caméra.</li></ol>',
    ],
    sizeHeading: 'Quelles dimensions de captures préparer ?',
    formatHeading: 'Quels formats peut-on exporter ?',
    browser: [
      'Peut-on prévisualiser n’importe quel site ?',
      '<p>Le site doit autoriser l’intégration dans une iframe. Les restrictions Content-Security-Policy frame-ancestors et X-Frame-Options ne peuvent pas être contournées. Le navigateur se connecte directement au site demandé.</p><p>Les parties de l’écran plié peuvent utiliser des pages indépendantes ; les clics et le défilement ne sont alors pas synchronisés. Ouvrez entièrement l’appareil pour tester l’interaction. L’export demande l’autorisation de capturer cet onglet Duo Studio. Les vues sont capturées localement, le partage s’arrête, puis le fichier est généré.</p>',
    ],
    privacy: [
      'Mes captures sont-elles envoyées à un serveur ?',
      '<p>Les images importées et les exports sont traités sur votre appareil. Le projet est enregistré dans le navigateur et peut être sauvegardé en .duo.json. Ce fichier contient les images originales : tenez-en compte avant de le partager. Sauvegardez-le avant d’effacer les données du navigateur. En mode web, les connexions au site choisi relèvent de ses propres pratiques de confidentialité.</p>',
    ],
    limits: [
      'Quelles sont les limites des images et animations ?',
      '<p>Images PNG, JPEG ou WebP : 4096 px par côté, 16 mégapixels et 20 Mo maximum. Les animations durent de 2 à 10 secondes, avec une pause facultative de 0 à 2 secondes à chaque extrémité. MP4 et WebM dépendent des encodeurs du navigateur. Les dimensions CSS du site et les pixels de l’image exportée se règlent séparément.</p>',
    ],
    attribution: [
      'Est-ce un outil officiel Apple ?',
      '<p>Duo Studio est un projet open source indépendant, pas un produit Apple. Les sources des modèles et les licences figurent dans le dépôt public. Une maquette ne prouve pas la compatibilité de l’application avec un appareil réel. Pour l’App Store, consultez les exigences actuelles et effectuez de vrais tests sur appareil.</p>',
    ],
    source: 'Code source, attribution et signalement de problèmes',
    related: 'Toutes les dimensions et spécifications d’export',
  },
};
export function translatedArticles(repo, image) {
  const facts = {},
    specs = {};
  for (const [lang, c] of Object.entries(copy)) {
    const sizes = table(c.sizes, c.screenRows),
      exports = table(c.exports, c.exportRows);
    const source = `<p><a href="${repo}">${c.source}</a></p>`;
    facts[lang] = {
      path: `/${lang}/guide/`,
      title: c.guideTitle,
      description: c.description,
      heading: c.heading,
      intro: c.intro,
      open: c.open,
      sections: [
        [c.how[0], c.how[1] + image('workspace', lang)],
        [
          c.sizeHeading,
          `<p>${c.specIntro}</p>${sizes}${image('poses', lang)}<p><a href="/${lang}/specs/">${c.related}</a></p>`,
        ],
        c.browser,
        [c.formatHeading, exports + image('export', lang)],
        c.privacy,
        c.limits,
        [c.attribution[0], c.attribution[1] + source],
      ],
    };
    specs[lang] = {
      path: `/${lang}/specs/`,
      title: c.specTitle,
      description: c.specDescription,
      heading: c.specHeading,
      intro: c.specIntro,
      open: c.open,
      sections: [
        [c.sizeHeading, sizes],
        [c.formatHeading, exports],
        c.limits,
        [c.attribution[0], c.attribution[1] + source],
      ],
    };
  }
  return { facts, specs };
}
