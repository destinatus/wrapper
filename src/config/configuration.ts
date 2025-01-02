import * as config from 'config';

export default () => {
  try {
    return {
      gemini: {
        apiKey: config.get<string>('gemini.apiKey')
      }
    };
  } catch (error) {
    console.error('Error loading configuration:', error);
    return {
      gemini: {
        apiKey: process.env.GEMINI_API_KEY || ''
      }
    };
  }
};
