import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { usePlatform } from '../contexts/PlatformContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ShareModal({ messages, agentName, agentIcon, onClose }) {
  const { settings } = usePlatform();
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [selectedMessages, setSelectedMessages] = useState(() => 
    messages.map((_, index) => index)
  );
  const contentRef = useRef();

  const generateImage = async () => {
    setLoading(true);
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      return canvas;
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const saveImage = async () => {
    const canvas = await generateImage();
    if (canvas) {
      canvas.toBlob((blob) => {
        saveAs(blob, `chat-${agentName}-${new Date().getTime()}.png`);
      });
    }
  };

  const copyToClipboard = async () => {
    const canvas = await generateImage();
    if (canvas) {
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          alert('Image copied to clipboard!');
        } catch (error) {
          console.error('Failed to copy:', error);
          alert('Failed to copy to clipboard');
        }
      });
    }
  };

  const shareImage = async () => {
    if (!navigator.share) {
      alert('Sharing is not supported on this device');
      return;
    }

    const canvas = await generateImage();
    if (canvas) {
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `chat-${agentName}.png`, { type: 'image/png' });
        try {
          await navigator.share({
            files: [file],
            title: `Chat with ${agentName}`,
            text: 'Check out this conversation!'
          });
        } catch (error) {
          console.error('Failed to share:', error);
        }
      });
    }
  };

  const toggleMessageSelection = (index) => {
    setSelectedMessages(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index].sort((a, b) => a - b)
    );
  };

  const selectAllMessages = () => {
    setSelectedMessages(messages.map((_, index) => index));
  };

  const deselectAllMessages = () => {
    setSelectedMessages([]);
  };

  const uploadImageForSharing = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('image', blob, 'share.png');

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/settings/share/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data.imageUrl;
    } catch (error) {
      console.error('Failed to upload image for sharing:', error);
      return null;
    }
  };

  const shareToSocialMedia = async (platform) => {
    const canvas = await generateImage();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      const text = `Check out my conversation with ${agentName}!`;
      const siteUrl = window.location.origin;
      const file = new File([blob], `chat-${agentName}-${Date.now()}.png`, { type: 'image/png' });

      // Try Web Share API first (mobile devices and some desktop browsers)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Chat with ${agentName}`,
            text: text,
            files: [file]
          });
          return;
        } catch (error) {
          console.log('Web Share API failed, falling back to other methods');
        }
      }

      // Upload image to backend for temporary hosting
      const imageUrl = await uploadImageForSharing(blob);
      
      // Try copying image to clipboard as backup
      let clipboardSuccess = false;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ]);
        clipboardSuccess = true;
      } catch (clipboardError) {
        console.log('Clipboard API not available');
      }

      // Create platform-specific sharing URLs
      let shareUrl;
      const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
      
      switch (platform) {
        case 'twitter':
          if (imageUrl) {
            // Twitter doesn't support direct image URLs in sharing, but we can include it in the text
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + '\n\n🖼️ ' + imageUrl)}`;
          } else {
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteUrl)}`;
          }
          break;
        case 'facebook':
          if (imageUrl) {
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(imageUrl)}&quote=${encodeURIComponent(text)}`;
          } else {
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}&quote=${encodeURIComponent(text)}`;
          }
          break;
        case 'linkedin':
          if (imageUrl) {
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(text)}`;
          } else {
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}&title=${encodeURIComponent(text)}`;
          }
          break;
        case 'reddit':
          if (imageUrl) {
            shareUrl = `https://reddit.com/submit?url=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(text)}`;
          } else {
            shareUrl = `https://reddit.com/submit?url=${encodeURIComponent(siteUrl)}&title=${encodeURIComponent(text)}`;
          }
          break;
        case 'whatsapp':
          if (imageUrl) {
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n\n🖼️ ' + imageUrl)}`;
          } else {
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + siteUrl)}`;
          }
          break;
        case 'telegram':
          if (imageUrl) {
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(imageUrl)}&text=${encodeURIComponent(text)}`;
          } else {
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent(text)}`;
          }
          break;
      }

      // Show instructions based on what worked
      let instructions = '';
      if (imageUrl && clipboardSuccess) {
        instructions = `✅ Ready to share!\n\n` +
          `📋 Image copied to clipboard\n` +
          `🔗 Image hosted temporarily\n\n` +
          `Instructions:\n` +
          `1. Click OK to open ${platformName}\n` +
          `2. The image link is included in the post\n` +
          `3. You can also paste the image directly (Ctrl+V)\n\n` +
          `Continue to ${platformName}?`;
      } else if (imageUrl) {
        instructions = `✅ Image ready to share!\n\n` +
          `🔗 Image hosted temporarily\n\n` +
          `Instructions:\n` +
          `1. Click OK to open ${platformName}\n` +
          `2. The image link is included in the post\n\n` +
          `Continue to ${platformName}?`;
      } else if (clipboardSuccess) {
        instructions = `📋 Image copied to clipboard!\n\n` +
          `Instructions:\n` +
          `1. Click OK to open ${platformName}\n` +
          `2. Paste the image in your post (Ctrl+V)\n\n` +
          `Continue to ${platformName}?`;
      } else {
        // Fallback: download image
        const link = document.createElement('a');
        link.download = `chat-${agentName}-${Date.now()}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        
        instructions = `📥 Image downloaded!\n\n` +
          `Instructions:\n` +
          `1. Click OK to open ${platformName}\n` +
          `2. Upload the downloaded image to your post\n\n` +
          `Continue to ${platformName}?`;
      }

      const shouldContinue = confirm(instructions);
      if (shouldContinue) {
        window.open(shareUrl, '_blank');
      }
    });
  };

  const filteredMessages = messages.filter((_, index) => selectedMessages.includes(index));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Share Conversation</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Message Selection Controls */}
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-gray-600">Select messages to share:</span>
            <button
              onClick={selectAllMessages}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <button
              onClick={deselectAllMessages}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Deselect All
            </button>
            <span className="text-sm text-gray-500">
              {selectedMessages.length} of {messages.length} selected
            </span>
          </div>
        </div>

        <div className="flex gap-6 p-6 overflow-y-auto max-h-[50vh]">
          {/* Message Selection Panel */}
          <div className="w-1/3 border-r border-gray-200 pr-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Messages</h3>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {messages.map((message, index) => (
                <div key={index} className="flex items-start gap-2 sm:gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedMessages.includes(index)}
                    onChange={() => toggleMessageSelection(index)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium mb-1 ${
                      message.role === 'user' ? 'text-blue-600' : 'text-purple-600'
                    }`}>
                      {message.role === 'user' ? 'You' : agentName}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">
                      {message.content?.substring(0, 80)}
                      {message.content?.length > 80 ? '...' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
            <div ref={contentRef} className="bg-white p-6 border border-gray-200 rounded-lg">
              <div className="mb-6 text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Conversation with {agentName}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {filteredMessages.map((message, index) => (
                  <div key={index} className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        {agentIcon ? (
                          <img
                            src={agentIcon}
                            alt={agentName}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs sm:text-sm font-semibold">
                            {agentName?.charAt(0) || 'A'}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] sm:max-w-[70%] ${message.role === 'user' ? 'order-first' : ''}`}>
                      <div className={`rounded-lg px-3 py-2 sm:px-4 ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-xs sm:text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className={`text-xs text-gray-500 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    {message.role === 'user' && (
                      <div className="flex-shrink-0 order-last">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs sm:text-sm font-semibold">
                          U
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-500">
                  Generated from {settings.site_name}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          {/* Export Options */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Export & Save</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={saveImage}
                disabled={loading || selectedMessages.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Save Image
              </button>

              <button
                onClick={copyToClipboard}
                disabled={loading || selectedMessages.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to Clipboard
              </button>

              {navigator.share && (
                <button
                  onClick={shareImage}
                  disabled={loading || selectedMessages.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.432 0m5.432 0A3 3 0 0112 21m0-6a3 3 0 002.684-4.342M12 15a3 3 0 01-2.684-4.342M12 3a3 3 0 100 6 3 3 0 000-6z" />
                  </svg>
                  Share
                </button>
              )}
            </div>
          </div>

          {/* Social Media Sharing */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Share on Social Media</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              <button
                onClick={() => shareToSocialMedia('twitter')}
                disabled={loading || selectedMessages.length === 0}
                className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                title="Share on Twitter"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                <span className="text-xs text-center">Twitter</span>
              </button>

              <button
                onClick={() => shareToSocialMedia('facebook')}
                disabled={loading || selectedMessages.length === 0}
                className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                title="Share on Facebook"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-xs text-center">Facebook</span>
              </button>

              <button
                onClick={() => shareToSocialMedia('linkedin')}
                disabled={loading || selectedMessages.length === 0}
                className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                title="Share on LinkedIn"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-xs text-center">LinkedIn</span>
              </button>

              <button
                onClick={() => shareToSocialMedia('whatsapp')}
                disabled={loading || selectedMessages.length === 0}
                className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                title="Share on WhatsApp"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.031-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                <span className="text-xs text-center">WhatsApp</span>
              </button>

              <button
                onClick={() => shareToSocialMedia('telegram')}
                disabled={loading || selectedMessages.length === 0}
                className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                title="Share on Telegram"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="text-xs text-center">Telegram</span>
              </button>

              <button
                onClick={() => shareToSocialMedia('reddit')}
                disabled={loading || selectedMessages.length === 0}
                className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                title="Share on Reddit"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614.003.11.003.221 0 .333 0 3.01-3.444 5.446-7.704 5.446s-7.704-2.436-7.704-5.446c0-.111-.003-.222 0-.333-.576-.281-1.011-.898-1.011-1.614 0-.968.786-1.754 1.754-1.754.477 0 .898.182 1.207.491 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                </svg>
                <span className="text-xs text-center">Reddit</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}