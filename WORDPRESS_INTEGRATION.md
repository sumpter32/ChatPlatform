# WordPress Integration Guide

This guide explains how to integrate WordPress as the authentication and subscription management system for the AI Chat Platform.

## Overview

The integration allows:
- WordPress users to log in to the Chat Platform using their WordPress credentials
- Only users with active subscriptions can access the platform
- Automatic user synchronization between WordPress and the Chat Platform
- Single Sign-On (SSO) from WordPress to the Chat Platform

## Installation Steps

### 1. Install the WordPress Plugin

1. Copy the `wordpress-plugin/chatplatform-integration.php` file to your WordPress site
2. Place it in `wp-content/plugins/chatplatform-integration/` directory
3. Activate the plugin in WordPress Admin → Plugins

### 2. Configure WordPress Plugin

1. Go to WordPress Admin → Settings → ChatPlatform
2. Generate a secure API key (e.g., use a password generator)
3. Enter your ChatPlatform URL (where the platform is hosted)
4. Save the settings

### 3. Configure ChatPlatform

1. Log in to ChatPlatform admin panel
2. Go to Settings → WordPress Integration
3. Enter your WordPress site URL
4. Enter the same API key you generated in step 2
5. Save and test the connection

### 4. Update Database

Run this SQL to add WordPress integration support:
```sql
ALTER TABLE users ADD COLUMN wordpress_id INT UNIQUE AFTER email;
```

## How It Works

### User Login Flow

1. User logs in to WordPress
2. WordPress redirects to ChatPlatform with SSO token
3. ChatPlatform verifies the token with WordPress
4. ChatPlatform checks if user has active subscription
5. If valid, user is logged in to ChatPlatform

### Subscription Verification

The plugin supports these subscription systems:
- WooCommerce Subscriptions
- MemberPress
- Paid Memberships Pro
- Custom implementation (using user meta)

### Custom Subscription Implementation

If using a custom subscription system, set these user meta fields:
- `chatplatform_subscription_active`: 'yes' or 'no'
- `chatplatform_subscription_status`: 'active', 'expired', 'cancelled'
- `chatplatform_subscription_plan`: Plan name

## API Endpoints

### WordPress Side
- `POST /wp-json/chatplatform/v1/verify-session` - Verify user session
- `GET /wp-json/chatplatform/v1/subscription-status/{user_id}` - Check subscription
- `POST /wp-json/chatplatform/v1/sso/verify` - Verify SSO token

### ChatPlatform Side
- `POST /api/wordpress-auth/verify` - Verify WordPress user
- `GET /api/wordpress-auth/subscription-status` - Check subscription status

## Security Considerations

1. **API Key**: Use a strong, randomly generated API key
2. **HTTPS**: Both WordPress and ChatPlatform should use HTTPS
3. **Token Expiry**: SSO tokens expire after 60 seconds
4. **Subscription Checks**: Performed on every login

## Troubleshooting

### "WordPress connection failed"
- Check if REST API is enabled on WordPress
- Verify the WordPress URL is correct
- Ensure API key matches on both sides

### "No active subscription"
- Verify subscription plugin is installed and active
- Check user has active subscription in WordPress
- Review custom subscription meta fields if using custom implementation

### "WordPress ChatPlatform plugin not installed"
- Ensure the plugin is activated in WordPress
- Check if REST API endpoints are accessible
- Verify permalink settings in WordPress

## Testing

1. Create a test user in WordPress
2. Assign an active subscription to the user
3. Log in to WordPress
4. You should be redirected to ChatPlatform
5. Verify user appears in ChatPlatform users table with wordpress_id

## Support

For issues or questions:
1. Check WordPress debug logs
2. Check ChatPlatform backend console
3. Verify API endpoints are accessible
4. Test with "Check API Status" button in settings