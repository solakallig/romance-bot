const { Client, GatewayIntentBits } = require("discord.js");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const matches = [...message.content.matchAll(/\{([^}]+)\}/g)];
  for (const match of matches) {
    const query = match[1];
    if (!query.toLowerCase().includes(" by ")) return;
    const [title, author] = query.split(/ by /i).map((s) => s.trim());

    const book = await searchRomanceIO(title, author);
    if (book) {
      message.channel.send(`**${title}** by **${author}**\n${book.description}\n<${book.url}>`);
    } else {
      message.channel.send(`Sorry, I couldn't find **${title} by ${author}** on Romance.io.`);
    }
  }
});

async function searchRomanceIO(title, author) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${title} by ${author} site:romance.io`)}`;
  const res = await fetch(searchUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();
  const links = [...html.matchAll(/https:\/\/romance\.io\/books\/[^"&]+/g)];
  const bookUrl = links.length ? links[0][0] : null;
  if (!bookUrl) return null;

  const pageRes = await fetch(bookUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const pageHtml = await pageRes.text();
  const $ = cheerio.load(pageHtml);
  const desc = $(".book-description p").first().text().trim();

  return desc ? { url: bookUrl, description: desc } : null;
}

client.login(process.env.DISCORD_TOKEN);
