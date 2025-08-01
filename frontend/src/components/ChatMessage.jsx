import { usePlatform } from '../contexts/PlatformContext';

export default function ChatMessage({ message, agentIcon, agentName }) {
  const isUser = message.role === 'user';
  const { settings } = usePlatform();

  return (
    <div className={`group px-3 sm:px-4 py-4 sm:py-6 hover:bg-gray-50/50 transition-colors`} style={isUser ? { backgroundColor: `${settings.primary_color}10` } : {}}>
      <div className={`max-w-3xl mx-auto flex gap-3 sm:gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-md text-sm" style={{
              backgroundImage: `linear-gradient(to bottom right, ${settings.primary_color}, ${settings.primary_color}dd)`
            }}>
              U
            </div>
          ) : (
            agentIcon ? (
              <img
                src={agentIcon}
                alt={agentName}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-100 shadow-md"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold shadow-md text-sm">
                {agentName?.charAt(0) || 'A'}
              </div>
            )
          )}
        </div>
        
        <div className={`flex-1 space-y-1 sm:space-y-2 ${isUser ? 'items-end' : ''}`}>
          <div className={`flex items-baseline gap-2 sm:gap-3 ${isUser ? 'justify-end' : ''}`}>
            <span className="font-semibold text-gray-900 text-sm sm:text-base">
              {isUser ? 'You' : agentName || 'Assistant'}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className={`${isUser ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block px-4 py-2 rounded-2xl ${isUser ? 'text-white' : 'bg-gray-100 text-gray-800'} max-w-[80%] text-left`} style={isUser ? { backgroundColor: settings.primary_color } : {}}>
              {message.content ? (
                <div className="text-sm sm:text-base leading-relaxed">
                  {message.content.split('\n').map((line, i) => (
                    <p key={i} className={line === '' ? 'h-3 sm:h-4' : ''}>
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 py-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}