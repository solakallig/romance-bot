const { Client, GatewayIntentBits } = require("discord.js");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
require("dotenv").config();

// Create Discord client with message intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Log when bot is ready
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Listen for messages
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Find all {Book Title by Author} patterns
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

// Scrape Romance.io directly (no Google)
async function searchRomanceIO(title, author) {
  const query = encodeURIComponent(`${title} ${author}`);
  const searchUrl = `https://romance.io/search?q=${query}`;

  const res = await fetch(searchUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();

  const $ = cheerio.load(html);

  // Get first search result
  const firstResult = $('a[href^="/books/"]').first();
  if (!firstResult.length) return null;

  const relativeUrl = firstResult.attr("href");
  const bookUrl = `https://romance.io${relativeUrl}`;

  // Load book page
  const bookPageRes = await fetch(bookUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const bookPageHtml = await bookPageRes.text();
  const $$ = cheerio.load(bookPageHtml);

  const description = $$(".book-description p").first().text().trim();
  if (!description) return null;

  return {
    url: bookUrl,
    description,
  };
}

// Start bot
client.login(process.env.DISCORD_TOKEN);
