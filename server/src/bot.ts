import mineflayer from 'mineflayer';

// but must be initialized before being able to start it
export function initalizeBotInstance(userName: string): Promise<any> {
    // create bot just to cache the auth token
    let bot: any = null;
    return new Promise((resolve, reject) => {
        bot = mineflayer.createBot({
            host: 'skyblock.net',
            username: userName,
            auth: 'microsoft',
            onMsaCode: (data) => {
                console.log(data);
                resolve(data);
            }
        });

        bot.once('login', () => {
            console.log('Login successful - auth was cached');
            bot.end();
            resolve({ requiresAuth: false, message: 'Already authenticated' });
        });
    });
}

export function startBot(userName: string, host: string) {
        // possible case trying to start the same bot twice
        /*if (bot) {
            bot.end();
        }*/

        let bot = mineflayer.createBot({
            host: host,
            username: userName,
            auth: 'microsoft',
        });

        return bot;
}