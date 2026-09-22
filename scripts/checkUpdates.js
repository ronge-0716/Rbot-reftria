const fs = require('node:fs');
const path = require('node:path');

const UPDATE_URL = 'https://rpg-reftria.com/api/system/news';

const CHANNEL_ID = '650975683098443777';

const STATE_PATH = path.join(__dirname, 'updateState.json');

async function checkUpdates(client) {
    try {
        console.log('更新情報チェック開始');

        const response = await fetch(UPDATE_URL);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const articles = json.articles || [];

        if (articles.length === 0) {
            console.log('更新情報が取得できませんでした。');
            return;
        }

        // 状態ファイルを読み込む
        let state = null;

        if (fs.existsSync(STATE_PATH)) {
            state = JSON.parse(
                fs.readFileSync(STATE_PATH, 'utf8')
            );
        }

        // 初回実行
        if (!state || !state.articles) {
            state = {
                articles: {}
            };

            for (const article of articles) {
                state.articles[article.id] = article;
            }

            fs.writeFileSync(
                STATE_PATH,
                JSON.stringify(state, null, 2),
                'utf8'
            );

            console.log(
                `初回実行：${articles.length}件の更新情報を記録しました。`
            );

            return;
        }

        // 新規・編集された記事を探す
        const newArticles = [];
        const editedArticles = [];

        for (const article of articles) {
            const oldArticle = state.articles[article.id];

            // 新しい記事
            if (!oldArticle) {
                newArticles.push(article);
                continue;
            }

            // 既存記事が編集された
            if (
                article.updated_at &&
                article.updated_at !== oldArticle.updated_at
            ) {
                editedArticles.push(article);
            }
        }

        // 現在の状態を保存
        for (const article of articles) {
            state.articles[article.id] = article;
        }

        fs.writeFileSync(
            STATE_PATH,
            JSON.stringify(state, null, 2),
            'utf8'
        );

        // 新しい情報がない場合
        if (
            newArticles.length === 0 &&
            editedArticles.length === 0
        ) {
            console.log('新しい更新情報はありません。');
            return;
        }

        const channel = await client.channels.fetch(CHANNEL_ID);

        if (!channel) {
            throw new Error('通知先チャンネルが見つかりません。');
        }

        // 古い記事 → 新しい記事の順番で通知
        newArticles.reverse();
        editedArticles.reverse();

        // 新規記事を通知
        for (const article of newArticles) {
            await sendArticle(
                channel,
                article,
                '🆕 新しい更新情報'
            );
        }

        // 編集記事を通知
        for (const article of editedArticles) {
            await sendArticle(
                channel,
                article,
                '✏️ 更新情報が編集されました'
            );
        }

        console.log(
            `新規 ${newArticles.length}件、編集 ${editedArticles.length}件を通知しました。`
        );

    } catch (error) {
        console.error('更新情報チェックエラー:', error);
    }
}


// Discordの2000文字制限を考慮して分割送信
async function sendArticle(channel, article, prefix) {
    const publishedDate = article.published_at
        ? new Date(article.published_at).toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo'
        })
        : '';

    const content =
        `${prefix}\n\n` +
        `## ${article.title}\n` +
        `公開日時：${publishedDate}\n\n` +
        `${article.body || ''}`;

    const chunks = splitMessage(content, 1900);

    for (const chunk of chunks) {
        await channel.send({
            content: chunk
        });
    }
}


// 2000文字を超えないように分割
function splitMessage(text, maxLength) {
    const chunks = [];

    let remaining = text;

    while (remaining.length > maxLength) {
        let index = remaining.lastIndexOf('\n', maxLength);

        if (index <= 0) {
            index = maxLength;
        }

        chunks.push(remaining.slice(0, index));
        remaining = remaining.slice(index).trimStart();
    }

    if (remaining.length > 0) {
        chunks.push(remaining);
    }

    return chunks;
}

async function sendLatestUpdate(client) {
    try {
        const response = await fetch(UPDATE_URL);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const articles = json.articles || [];

        if (articles.length === 0) {
            console.log('更新情報がありません。');
            return;
        }

        // APIの先頭を最新記事として扱う
        const latestArticle = articles[0];

        const channel = await client.channels.fetch(CHANNEL_ID);

        if (!channel) {
            throw new Error('通知先チャンネルが見つかりません。');
        }

        await sendArticle(
            channel,
            latestArticle,
            '🆕 最新の更新情報'
        );

        console.log(
            `最新の更新情報を送信しました: ${latestArticle.title}`
        );

    } catch (error) {
        console.error('最新更新情報送信エラー:', error);
    }
}

module.exports = {
    checkUpdates,
    sendLatestUpdate
};