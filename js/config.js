const CONFIG = {

  API_KEY: "YOUR_API_KEY",  // paste your api key here

 
  API_URL: "https://api.groq.com/openai/v1/chat/completions",

  MAX_TOKENS: 1000,


  ACTIVE_MODEL: "llama",


 MODELS: {
    llama: {
      id:    "llama-3.3-70b-versatile",
      label: "Llama 3.3",
      icon:  "✦",
      desc:  "Best & emotional",
      color: "#10a37f",
    },
    mixtral: {
      id:    "llama-3.1-8b-instant",  
      label: "Llama Instant",
      icon:  "◈",
      desc:  "Warm & deep",
      color: "#d4a27f",
    },
 gemma: {
  id:    "gemma-7b-it",  
  label: "Gemma 2",
  icon:  "◇",
  desc:  "Fast & creative",
  color: "#4285f4",
},
  },
};
