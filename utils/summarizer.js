const natural = require('natural');
const { WordTokenizer, SentenceTokenizer, PorterStemmer } = natural;
const stopwords = require('natural/lib/natural/util/stopwords').words;

// Initialize tokenizers
const sentenceTokenizer = new SentenceTokenizer();
const wordTokenizer = new WordTokenizer();

function summarizeArticle(text, summaryLength = 3) {
    // Preprocess text
    const cleanedText = cleanText(text);

    // Split into sentences
    const sentences = sentenceTokenizer.tokenize(cleanedText);

    // Tokenize and stem words, removing stopwords
    const processedSentences = sentences.map(sentence => ({
        original: sentence,
        words: wordTokenizer.tokenize(sentence)
            .filter(word => !stopwords.includes(word.toLowerCase()))
            .map(word => PorterStemmer.stem(word))
    }));

    // Calculate word frequencies
    const wordFrequencies = processedSentences
        .flatMap(s => s.words)
        .reduce((acc, word) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
        }, {});

    // Score sentences based on word frequencies
    const scoredSentences = processedSentences.map(sentence => {
        const score = sentence.words.reduce((sum, word) => sum + (wordFrequencies[word] || 0), 0);
        return { sentence: sentence.original, score: score / sentence.words.length };
    });

    // Sort sentences by score and select top N
    return scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, summaryLength)
        .map(s => s.sentence)
        .join(' ');
}

function cleanText(text) {
    return text
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ')      // Remove extra whitespace
        .replace(/[^a-zA-Z0-9.,!? ]/g, '') // Remove special chars
        .toLowerCase();
}
module.exports = summarizeArticle;
