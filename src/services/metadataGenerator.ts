interface MetadataInput {
  creatorName: string;
  videoTopic: string;
  language?: string;
  keywords?: string;
}

interface PlatformMetadata {
  platform: string;
  title: string;
  description: string;
  hashtags: string[];
}

export class MetadataGenerator {
  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private generateHashtags(topic: string, keywords: string, platform: string): string[] {
    const baseHashtags = [];
    
    // Extract hashtags from topic and keywords
    const topicWords = topic.toLowerCase().split(' ').filter(word => word.length > 2);
    const keywordsList = keywords ? keywords.split(',').map(k => k.trim().toLowerCase()) : [];
    
    // Add topic-based hashtags
    topicWords.forEach(word => {
      if (word.length > 3) {
        baseHashtags.push(`#${word.replace(/[^a-zA-Z0-9]/g, '')}`);
      }
    });
    
    // Add keyword-based hashtags
    keywordsList.forEach(keyword => {
      if (keyword.length > 2) {
        baseHashtags.push(`#${keyword.replace(/[^a-zA-Z0-9]/g, '')}`);
      }
    });
    
    // Platform-specific hashtags
    const platformHashtags = {
      youtube: ['#youtube', '#video', '#content', '#subscribe'],
      instagram: ['#instagram', '#reel', '#viral', '#explore', '#follow'],
      tiktok: ['#tiktok', '#fyp', '#viral', '#trending', '#foryou']
    };
    
    const platformSpecific = platformHashtags[platform.toLowerCase()] || [];
    
    // Combine and deduplicate
    const allHashtags = [...new Set([...baseHashtags, ...platformSpecific])];
    
    // Return appropriate number for each platform
    const limits = { youtube: 15, instagram: 20, tiktok: 10 };
    const limit = limits[platform.toLowerCase()] || 10;
    
    return allHashtags.slice(0, limit);
  }

  private generateYouTubeMetadata(input: MetadataInput): PlatformMetadata {
    const titleTemplates = [
      `${input.videoTopic} - Complete Guide`,
      `How to ${input.videoTopic}`,
      `${input.videoTopic}: Everything You Need to Know`,
      `The Ultimate ${input.videoTopic} Tutorial`,
      `${input.videoTopic} Explained Simply`
    ];

    const title = this.getRandomElement(titleTemplates);
    
    const description = `Welcome to ${input.creatorName}'s channel! 

In this video, we dive deep into ${input.videoTopic}. Whether you're a beginner or looking to expand your knowledge, this comprehensive guide has something for everyone.

🎯 What you'll learn:
• Key concepts about ${input.videoTopic}
• Practical tips and strategies
• Real-world applications
• Expert insights and advice

💡 Don't forget to:
• Subscribe for more content like this
• Hit the notification bell
• Leave a comment with your thoughts
• Share with friends who might find this helpful

🔗 Connect with me:
Follow for more amazing content and updates!

#${input.videoTopic.replace(/\s+/g, '')} #Tutorial #Guide

---
Created by ${input.creatorName}`;

    const hashtags = this.generateHashtags(input.videoTopic, input.keywords || '', 'youtube');

    return {
      platform: 'YouTube',
      title,
      description,
      hashtags
    };
  }

  private generateInstagramMetadata(input: MetadataInput): PlatformMetadata {
    const captionTemplates = [
      `✨ ${input.videoTopic} vibes ✨`,
      `💫 Exploring ${input.videoTopic} today`,
      `🔥 ${input.videoTopic} content dropping!`,
      `⚡ ${input.videoTopic} insights coming your way`,
      `🌟 All about ${input.videoTopic}`
    ];

    const title = this.getRandomElement(captionTemplates);
    
    const description = `${title}

Hey beautiful souls! 👋 It's ${input.creatorName} here with some fresh content about ${input.videoTopic}. 

✨ What's in this reel:
• Amazing insights about ${input.videoTopic}
• Tips that actually work
• Content you'll love and share

💕 Your support means everything! Don't forget to:
• Double tap if you loved this ❤️
• Save for later 📌
• Share with your bestie 👯‍♀️
• Follow for daily inspiration 🌈

Drop a 🔥 in the comments if you want more ${input.videoTopic} content!

---
Created with love by ${input.creatorName} 💝`;

    const hashtags = this.generateHashtags(input.videoTopic, input.keywords || '', 'instagram');

    return {
      platform: 'Instagram',
      title,
      description,
      hashtags
    };
  }

  private generateTikTokMetadata(input: MetadataInput): PlatformMetadata {
    const titleTemplates = [
      `${input.videoTopic} hack you NEED to know! 🤯`,
      `POV: You finally understand ${input.videoTopic} ✨`,
      `${input.videoTopic} but make it simple 💫`,
      `This ${input.videoTopic} tip changed everything 🔥`,
      `${input.videoTopic} explained in 60 seconds ⏰`
    ];

    const title = this.getRandomElement(titleTemplates);
    
    const description = `${title}

Follow @${input.creatorName.toLowerCase().replace(/\s+/g, '')} for more ${input.videoTopic} content! 

🔥 This ${input.videoTopic} tip is EVERYTHING
✨ Save this for later
💫 Tag someone who needs to see this
🚀 Follow for daily tips

Which part surprised you the most? Let me know! 👇

#${input.videoTopic.replace(/\s+/g, '')} #viral #tips`;

    const hashtags = this.generateHashtags(input.videoTopic, input.keywords || '', 'tiktok');

    return {
      platform: 'TikTok',
      title,
      description,
      hashtags
    };
  }

  public generatePlatformMetadata(input: MetadataInput): PlatformMetadata[] {
    return [
      this.generateYouTubeMetadata(input),
      this.generateInstagramMetadata(input),
      this.generateTikTokMetadata(input)
    ];
  }
}

export const metadataGenerator = new MetadataGenerator();