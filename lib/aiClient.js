// This file handles all communication with the AI service
// It uses the proxy API routes to avoid CORS issues

const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || 'http://localhost:5001';

class AIClient {
  // Helper to make API calls with error handling
  async fetchWithRetry(url, options = {}, retries = 2) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  // Get available job roles
  async getRoles() {
    try {
      // Using our Next.js API proxy
      return await this.fetchWithRetry('/api/ai/roles');
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      // Fallback to direct call if proxy fails
      return await this.fetchWithRetry(`${AI_BASE_URL}/roles`);
    }
  }

  // Start an interview session
  async startInterview(candidateInfo) {
    try {
      // Using our Next.js API proxy
      return await this.fetchWithRetry('/api/ai/interview/start', {
        method: 'POST',
        body: JSON.stringify({ candidate_info: candidateInfo }),
      });
    } catch (error) {
      console.error('Failed to start interview:', error);
      // Fallback to direct call
      return await this.fetchWithRetry(`${AI_BASE_URL}/interview/start`, {
        method: 'POST',
        body: JSON.stringify({ candidate_info: candidateInfo }),
      });
    }
  }

  // Submit answers and get assessment
  async assessInterview(candidateInfo, answers) {
    try {
      // Using our Next.js API proxy
      return await this.fetchWithRetry('/api/ai/interview/assess', {
        method: 'POST',
        body: JSON.stringify({
          candidate_info: candidateInfo,
          answers: answers,
        }),
      });
    } catch (error) {
      console.error('Failed to assess interview:', error);
      // Fallback to direct call
      return await this.fetchWithRetry(`${AI_BASE_URL}/interview/assess`, {
        method: 'POST',
        body: JSON.stringify({
          candidate_info: candidateInfo,
          answers: answers,
        }),
      });
    }
  }

  // Check AI service health
  async checkHealth() {
    try {
      return await this.fetchWithRetry('/api/ai/health');
    } catch (error) {
      console.error('Failed to check health:', error);
      return await this.fetchWithRetry(`${AI_BASE_URL}/health`);
    }
  }
}

// Export a single instance
const aiClient = new AIClient();
export default aiClient;