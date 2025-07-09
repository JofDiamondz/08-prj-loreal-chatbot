/* 🧠 L'Oréal Beauty Expert Chatbot */
/* Features: French beauty expertise, L'Oréal products, conversation history */

/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

/* Configuration */
const CLOUDFLARE_ENDPOINT =
  "https://l-oreal-chat-bot.tellezasturias.workers.dev/";

/* System prompt for OpenAI - defines the L'Oréal beauty expert persona */
const systemPrompt = `You are a refined French beauty expert working for L'Oréal. 
You help users find L'Oréal products and build beauty routines.
Only discuss makeup, skincare, haircare, fragrances, and beauty.
Always respond with professionalism, charm, and a hint of elegance.
Refuse unrelated questions politely and redirect to L'Oréal beauty topics.
Sprinkle in a few emojis like ✨💄💬 where appropriate.

Respond naturally and conversationally. Only use line breaks to separate truly different topics or sections. 
When recommending products, you can use the format "Product Name: Description" but keep related content together.
Write in a flowing, natural style rather than breaking everything into separate points.`;

/* Conversation history for multi-turn context */
let conversationHistory = [];

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user message
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  // Clear input and disable form
  userInput.value = "";
  setFormState(false);

  // Display user message
  displayMessage(userMessage, "user");

  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // Show loading animation
  const loadingId = showLoadingMessage();

  try {
    // Send request to OpenAI via Cloudflare Worker
    const response = await sendToOpenAI(userMessage);

    // Remove loading animation
    removeLoadingMessage(loadingId);

    // Display assistant response
    displayMessage(response, "assistant");

    // Add assistant response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: response,
    });
  } catch (error) {
    // Remove loading animation and show error
    removeLoadingMessage(loadingId);
    displayMessage(
      "Je suis désolée, but I'm having trouble connecting right now. Please try again in a moment. ✨",
      "assistant"
    );
    console.error("Error:", error);
  }

  // Re-enable form
  setFormState(true);
});

/* Send message to OpenAI via Cloudflare Worker */
async function sendToOpenAI(userMessage) {
  // Prepare messages array with system prompt and conversation history
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-10), // Keep last 10 messages for context
  ];

  // Make request to Cloudflare Worker
  const response = await fetch(CLOUDFLARE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o", // Using gpt-4o as specified
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  // Check if request was successful
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Parse response
  const data = await response.json();

  // Extract message content
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  } else {
    throw new Error("Invalid response format from OpenAI");
  }
}

/* Display message in chat window with proper formatting */
function displayMessage(message, sender) {
  // Parse the message into separate sections (paragraphs and lists)
  const sections = parseMessageSections(message);

  // Create each section as a separate bubble
  sections.forEach((section, index) => {
    // Create message container
    const messageContainer = document.createElement("div");
    messageContainer.className = `message-container ${sender}`;

    // Only show avatar for the first bubble in a sequence
    if (index === 0) {
      // Create avatar
      const avatarContainer = document.createElement("div");
      avatarContainer.className = "avatar-container";

      const avatar = document.createElement("div");
      avatar.className = "avatar";

      const avatarImage = document.createElement("img");
      avatarImage.className = "avatar-image";

      if (sender === "assistant") {
        avatarImage.src = "img/loreal-bot.png";
        avatarImage.alt = "L'Oréal Beauty Expert";
      } else {
        avatarImage.src = "img/woman.jpeg";
        avatarImage.alt = "User";
      }

      avatar.appendChild(avatarImage);
      avatarContainer.appendChild(avatar);
      messageContainer.appendChild(avatarContainer);
    } else {
      // Create empty space for subsequent bubbles to align properly
      const spacer = document.createElement("div");
      spacer.className = "avatar-spacer";
      messageContainer.appendChild(spacer);
    }

    // Create message bubble
    const messageBubble = document.createElement("div");
    messageBubble.className = `message-bubble ${sender}`;

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    // Handle different section types
    if (section.type === "list") {
      // Create list without bullets
      const listContainer = document.createElement("div");
      listContainer.className = "list-container";

      section.items.forEach((item) => {
        const listItem = document.createElement("div");
        listItem.className = "list-item";

        // Check if item has a title (content before colon)
        if (item.includes(":")) {
          const parts = item.split(":", 2);
          let title = parts[0].trim();
          const content = parts[1].trim();

          // Remove asterisks from title
          title = title.replace(/\*\*/g, "");

          // Create title element
          const titleElement = document.createElement("span");
          titleElement.className = "list-title";
          titleElement.textContent = title + ": ";

          // Create content element
          const contentElement = document.createElement("span");
          contentElement.className = "list-content";
          contentElement.textContent = content;

          listItem.appendChild(titleElement);
          listItem.appendChild(contentElement);
        } else {
          // No title, just regular content - remove asterisks
          const cleanItem = item.replace(/\*\*/g, "");
          listItem.textContent = cleanItem;
        }

        listContainer.appendChild(listItem);
      });

      messageContent.appendChild(listContainer);
    } else {
      // Regular paragraph - remove asterisks
      const cleanText = section.text.replace(/\*\*/g, "");
      messageContent.textContent = cleanText;
    }

    messageBubble.appendChild(messageContent);
    messageContainer.appendChild(messageBubble);

    // Add to chat window
    chatWindow.appendChild(messageContainer);
  });

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Parse message into sections (paragraphs and lists) */
function parseMessageSections(message) {
  const sections = [];

  // Split by double line breaks (clear paragraph separators) or significant breaks
  const majorSections = message
    .split(/\n\s*\n/)
    .filter((section) => section.trim() !== "");

  majorSections.forEach((section) => {
    const lines = section.split("\n").filter((line) => line.trim() !== "");

    let currentContent = "";
    let currentList = [];
    let inList = false;

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      // Check if this line is a list item
      const isListItem =
        /^(\d+\.|•|-|\*)\s/.test(trimmedLine) ||
        /^[A-Za-z]\.\s/.test(trimmedLine) ||
        trimmedLine.startsWith("- ") ||
        trimmedLine.startsWith("* ") ||
        (trimmedLine.includes(":") && trimmedLine.length < 100); // Likely a title:description format

      if (isListItem) {
        // If we were building content, save it first
        if (currentContent.trim()) {
          sections.push({
            type: "paragraph",
            text: currentContent.trim(),
          });
          currentContent = "";
        }

        // Clean the list item (remove numbering and bullets)
        let cleanItem = trimmedLine.replace(
          /^(\d+\.|•|-|\*|[A-Za-z]\.)\s*/,
          ""
        );
        currentList.push(cleanItem);
        inList = true;
      } else {
        // If we were building a list, save it first
        if (inList && currentList.length > 0) {
          sections.push({
            type: "list",
            items: [...currentList],
          });
          currentList = [];
          inList = false;
        }

        // Add to current content
        if (currentContent) {
          currentContent += " " + trimmedLine;
        } else {
          currentContent = trimmedLine;
        }
      }
    });

    // Handle any remaining content
    if (currentContent.trim()) {
      sections.push({
        type: "paragraph",
        text: currentContent.trim(),
      });
    }

    if (currentList.length > 0) {
      sections.push({
        type: "list",
        items: currentList,
      });
    }
  });

  // If no sections were created, create a single paragraph
  if (sections.length === 0) {
    sections.push({
      type: "paragraph",
      text: message.trim(),
    });
  }

  return sections;
}

/* Show loading animation */
function showLoadingMessage() {
  const loadingId = `loading-${Date.now()}`;

  // Create loading message container
  const messageContainer = document.createElement("div");
  messageContainer.className = "message-container assistant";
  messageContainer.id = loadingId;

  // Create avatar
  const avatarContainer = document.createElement("div");
  avatarContainer.className = "avatar-container";

  const avatar = document.createElement("div");
  avatar.className = "avatar";

  const avatarImage = document.createElement("img");
  avatarImage.className = "avatar-image";
  avatarImage.src = "img/loreal-bot.png";
  avatarImage.alt = "L'Oréal Beauty Expert";

  avatar.appendChild(avatarImage);
  avatarContainer.appendChild(avatar);

  // Create loading bubble
  const messageBubble = document.createElement("div");
  messageBubble.className = "message-bubble assistant";

  const loadingDots = document.createElement("div");
  loadingDots.className = "loading-dots";

  // Create 3 loading dots
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.className = "loading-dot";
    loadingDots.appendChild(dot);
  }

  messageBubble.appendChild(loadingDots);

  // Assemble loading container
  messageContainer.appendChild(avatarContainer);
  messageContainer.appendChild(messageBubble);

  // Add to chat window
  chatWindow.appendChild(messageContainer);

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return loadingId;
}

/* Remove loading animation */
function removeLoadingMessage(loadingId) {
  const loadingElement = document.getElementById(loadingId);
  if (loadingElement) {
    loadingElement.remove();
  }
}

/* Enable/disable form */
function setFormState(enabled) {
  userInput.disabled = !enabled;
  sendBtn.disabled = !enabled;

  if (enabled) {
    userInput.focus();
  }
}

/* Initialize the chatbot */
function initializeChatbot() {
  // Focus on input field
  userInput.focus();

  // Add enter key listener (already handled by form submit)
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  console.log("🧠 L'Oréal Beauty Expert Chatbot initialized!");
  console.log("✨ System prompt:", systemPrompt);
  console.log("🔗 Cloudflare endpoint:", CLOUDFLARE_ENDPOINT);
}

/* Start the chatbot when page loads */
document.addEventListener("DOMContentLoaded", initializeChatbot);
