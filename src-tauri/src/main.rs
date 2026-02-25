// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::env;


// --- Structures communes ---
#[derive(Serialize)]
struct Content {
    parts: Vec<Part>,
}

#[derive(Serialize)]
struct Part {
    text: String,
}

// --- Structures pour TTS (Text-to-Speech) ---
#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<Content>,
    config: Config,
}

#[derive(Serialize)]
struct Config {
    #[serde(rename = "responseModalities")]
    response_modalities: Vec<String>,
    #[serde(rename = "speechConfig")]
    speech_config: SpeechConfig,
}

#[derive(Serialize)]
struct SpeechConfig {
    #[serde(rename = "voiceConfig")]
    voice_config: VoiceConfig,
}

#[derive(Serialize)]
struct VoiceConfig {
    #[serde(rename = "prebuiltVoiceConfig")]
    prebuilt_voice_config: PrebuiltVoiceConfig,
}

#[derive(Serialize)]
struct PrebuiltVoiceConfig {
    #[serde(rename = "voiceName")]
    voice_name: String,
}

#[derive(Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<Candidate>>,
}

#[derive(Deserialize)]
struct Candidate {
    content: Option<CandidateContent>,
}

#[derive(Deserialize)]
struct CandidateContent {
    parts: Option<Vec<CandidatePart>>,
}

#[derive(Deserialize)]
struct CandidatePart {
    #[serde(rename = "inlineData")]
    inline_data: Option<InlineData>,
}

#[derive(Deserialize)]
struct InlineData {
    data: String,
}

// --- Structures pour génération de texte ---
#[derive(Serialize)]
struct TextGenerationRequest {
    contents: Vec<Content>,
}

#[derive(Deserialize)]
struct TextGenerationResponse {
    candidates: Option<Vec<TextCandidate>>,
}

#[derive(Deserialize)]
struct TextCandidate {
    content: Option<TextCandidateContent>,
}

#[derive(Deserialize)]
struct TextCandidateContent {
    parts: Option<Vec<TextPart>>,
}

#[derive(Deserialize)]
struct TextPart {
    text: String,
}

// --- Structures pour IA Locale (OpenAI Compatible - Ollama/LM Studio) ---
#[derive(Serialize)]
struct OpenAIChatRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: f32,
}

#[derive(Serialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OpenAIChatResponse {
    choices: Option<Vec<OpenAIChoice>>,
}

#[derive(Deserialize)]
struct OpenAIChoice {
    message: Option<OpenAIMessageContent>,
}

#[derive(Deserialize)]
struct OpenAIMessageContent {
    content: String,
}

// --- Commandes ---

#[tauri::command]
async fn generate_speech(text: String, lang: String, api_key: Option<String>) -> Result<String, String> {
    let final_api_key = if let Some(key) = api_key {
        key
    } else {
        env::var("GEMINI_API_KEY").map_err(|_| "API key not configured (env var missing and not provided)".to_string())?
    };
    
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
        final_api_key
    );

    let request_body = GeminiRequest {
        contents: vec![Content {
            parts: vec![Part { text }],
        }],
        config: Config {
            response_modalities: vec!["AUDIO".to_string()],
            speech_config: SpeechConfig {
                voice_config: VoiceConfig {
                    prebuilt_voice_config: PrebuiltVoiceConfig {
                        voice_name: format!("{}-Standard-A", lang),
                    },
                },
            },
        },
    };

    let client = reqwest::Client::new();
    let res = client.post(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !res.status().is_success() {
        let error_text = res.text().await.unwrap_or_default();
        return Err(format!("API error: {}", error_text));
    }

    let response_json: GeminiResponse = res.json().await.map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(candidates) = response_json.candidates {
        if let Some(first_candidate) = candidates.first() {
            if let Some(content) = &first_candidate.content {
                if let Some(parts) = &content.parts {
                    if let Some(first_part) = parts.first() {
                        if let Some(inline_data) = &first_part.inline_data {
                            return Ok(inline_data.data.clone());
                        }
                    }
                }
            }
        }
    }

    Err("No audio data found in response".to_string())
}

#[tauri::command]
async fn generate_flashcards_command(prompt: String, api_key: Option<String>, model_name: Option<String>) -> Result<String, String> {
    let final_api_key = if let Some(key) = api_key {
        key
    } else {
        env::var("GEMINI_API_KEY").map_err(|_| "API key not configured (env var missing and not provided)".to_string())?
    };

    let model = model_name.unwrap_or_else(|| "gemini-2.5-flash".to_string());

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model,
        final_api_key
    );

    let request_body = TextGenerationRequest {
        contents: vec![Content {
            parts: vec![Part { text: prompt }],
        }],
        // Pas de generation_config - l'API retournera du texte brut
    };

    let client = reqwest::Client::new();
    let res = client.post(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !res.status().is_success() {
        let error_text = res.text().await.unwrap_or_default();
        return Err(format!("API error: {}", error_text));
    }

    let response_json: TextGenerationResponse = res.json().await.map_err(|e| format!("Parse error: {}", e))?;

    if let Some(candidates) = response_json.candidates {
        if let Some(first) = candidates.first() {
            if let Some(content) = &first.content {
                if let Some(parts) = &content.parts {
                    if let Some(part) = parts.first() {
                        return Ok(part.text.clone());
                    }
                }
            }
        }
    }

    Err("No text generated".to_string())
}

// Nouvelle commande pour lister les modèles disponibles
#[tauri::command]
async fn list_gemini_models(api_key: String) -> Result<String, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models?key={}",
        api_key.trim()
    );

    let client = reqwest::Client::new();
    let res = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !res.status().is_success() {
        let error_text = res.text().await.unwrap_or_default();
        return Err(format!("API error: {}", error_text));
    }

    let response_text = res.text().await.map_err(|e| format!("Parse error: {}", e))?;
    Ok(response_text)
}

#[tauri::command]
async fn generate_flashcards_local(prompt: String, api_url: String, model_name: String) -> Result<String, String> {
    // URL par défaut pour Ollama si non fournie: http://localhost:11434/v1/chat/completions
    // URL par défaut pour LM Studio: http://localhost:1234/v1/chat/completions
    
    let client = reqwest::Client::new();
    
    let request_body = OpenAIChatRequest {
        model: model_name,
        messages: vec![OpenAIMessage {
            role: "user".to_string(),
            content: prompt,
        }],
        temperature: 0.7,
    };

    let res = client.post(&api_url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Local API Request failed: {}. Make sure your local AI server (Ollama/LM Studio) is running.", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let error_text = res.text().await.unwrap_or_default();
        return Err(format!("Local API error: {} - {}", status, error_text));
    }

    let response_json: OpenAIChatResponse = res.json().await.map_err(|e| format!("Parse error: {}", e))?;

    if let Some(choices) = response_json.choices {
        if let Some(first) = choices.first() {
            if let Some(message) = &first.message {
                return Ok(message.content.clone());
            }
        }
    }

    Err("No text generated from local AI".to_string())
}

/// Commande Tauri pour télécharger une transcription YouTube
/// Contourne les limitations de Tauri's fetch API
#[tauri::command]
async fn fetch_youtube_transcript(url: String) -> Result<String, String> {
    println!("[Rust] 🚀 Starting transcript fetch");
    println!("[Rust] URL: {}...", &url[..url.len().min(100)]);
    
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| {
            let msg = format!("❌ Client build failed: {}", e);
            println!("[Rust] {}", msg);
            msg
        })?;
    
    println!("[Rust] 📡 Sending HTTP request...");;
    
    let response = client
        .get(&url)
        .header("Referer", "https://www.youtube.com/")
        .header("Origin", "https://www.youtube.com")
        .send()
        .await
        .map_err(|e| {
            let msg = format!("❌ HTTP request failed: {}", e);
            println!("[Rust] {}", msg);
            msg
        })?;
    
    println!("[Rust] 📥 Response status: {}", response.status());;
    
    if !response.status().is_success() {
        let msg = format!("❌ HTTP error: {}", response.status());
        println!("[Rust] {}", msg);
        return Err(msg);
    }
    
    println!("[Rust] 📖 Reading response body...");
    
    let text = response
        .text()
        .await
        .map_err(|e| {
            let msg = format!("❌ Failed to read body: {}", e);
            println!("[Rust] {}", msg);
            msg
        })?;
    
    println!("[Rust] ✅ Successfully fetched {} bytes", text.len());
    
    if text.is_empty() {
        println!("[Rust] ⚠️ Warning: Response body is empty");
    }
    
    Ok(text)
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      generate_speech, 
      generate_flashcards_command, 
      generate_flashcards_local, 
      list_gemini_models,
      fetch_youtube_transcript
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
