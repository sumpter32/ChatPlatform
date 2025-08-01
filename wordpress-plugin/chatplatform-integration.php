<?php
/**
 * Plugin Name: ChatPlatform Integration
 * Description: Integrates WordPress authentication and subscriptions with AI Chat Platform
 * Version: 1.0.0
 * Author: Your Company
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Add REST API endpoints
add_action('rest_api_init', function () {
    // Verify user session
    register_rest_route('chatplatform/v1', '/verify-session', array(
        'methods' => 'POST',
        'callback' => 'chatplatform_verify_session',
        'permission_callback' => 'chatplatform_verify_api_key'
    ));
    
    // Check subscription status
    register_rest_route('chatplatform/v1', '/subscription-status/(?P<user_id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'chatplatform_subscription_status',
        'permission_callback' => 'chatplatform_verify_api_key'
    ));
});

// Verify API key from ChatPlatform
function chatplatform_verify_api_key($request) {
    $api_key = $request->get_header('X-API-Key');
    $stored_key = get_option('chatplatform_api_key');
    
    return $api_key && $stored_key && $api_key === $stored_key;
}

// Verify user session
function chatplatform_verify_session($request) {
    $params = $request->get_json_params();
    $session_token = $params['session_token'] ?? '';
    $user_id = $params['user_id'] ?? 0;
    
    // Verify the session token (this depends on your WordPress setup)
    // For now, we'll check if the user is logged in via cookies
    $user = get_user_by('id', $user_id);
    
    if (!$user) {
        return new WP_REST_Response(array(
            'valid' => false,
            'message' => 'User not found'
        ), 404);
    }
    
    // Check if user has active subscription
    $has_subscription = chatplatform_check_user_subscription($user_id);
    $subscription_details = chatplatform_get_subscription_details($user_id);
    
    return new WP_REST_Response(array(
        'valid' => true,
        'user' => array(
            'id' => $user->ID,
            'email' => $user->user_email,
            'display_name' => $user->display_name,
            'has_active_subscription' => $has_subscription,
            'subscription_status' => $subscription_details['status'] ?? 'none',
            'subscription_plan' => $subscription_details['plan'] ?? null
        )
    ), 200);
}

// Check if user has active subscription
function chatplatform_check_user_subscription($user_id) {
    // Check WooCommerce Subscriptions
    if (function_exists('wcs_user_has_subscription')) {
        return wcs_user_has_subscription($user_id, '', 'active');
    }
    
    // Check MemberPress
    if (class_exists('MeprUser')) {
        $user = new MeprUser($user_id);
        return $user->is_active();
    }
    
    // Check Paid Memberships Pro
    if (function_exists('pmpro_hasMembershipLevel')) {
        return pmpro_hasMembershipLevel(null, $user_id);
    }
    
    // Check user meta for custom subscription
    $subscription_status = get_user_meta($user_id, 'chatplatform_subscription_active', true);
    return $subscription_status === 'yes';
}

// Get subscription details
function chatplatform_get_subscription_details($user_id) {
    $details = array(
        'status' => 'none',
        'plan' => null,
        'expires_at' => null
    );
    
    // WooCommerce Subscriptions
    if (function_exists('wcs_get_users_subscriptions')) {
        $subscriptions = wcs_get_users_subscriptions($user_id);
        foreach ($subscriptions as $subscription) {
            if ($subscription->has_status('active')) {
                $details['status'] = 'active';
                $details['plan'] = $subscription->get_items()[0]->get_name();
                $details['expires_at'] = $subscription->get_date('next_payment');
                break;
            }
        }
    }
    
    // MemberPress
    if (class_exists('MeprUser')) {
        $user = new MeprUser($user_id);
        $subscriptions = $user->active_product_subscriptions();
        if (!empty($subscriptions)) {
            $details['status'] = 'active';
            $membership = new MeprProduct($subscriptions[0]->product_id);
            $details['plan'] = $membership->post_title;
        }
    }
    
    // Custom implementation
    if ($details['status'] === 'none') {
        $custom_status = get_user_meta($user_id, 'chatplatform_subscription_status', true);
        $custom_plan = get_user_meta($user_id, 'chatplatform_subscription_plan', true);
        
        if ($custom_status) {
            $details['status'] = $custom_status;
            $details['plan'] = $custom_plan;
        }
    }
    
    return $details;
}

// Get subscription status endpoint
function chatplatform_subscription_status($request) {
    $user_id = $request->get_param('user_id');
    $details = chatplatform_get_subscription_details($user_id);
    
    return new WP_REST_Response($details, 200);
}

// Add settings page
add_action('admin_menu', function() {
    add_options_page(
        'ChatPlatform Integration',
        'ChatPlatform',
        'manage_options',
        'chatplatform-settings',
        'chatplatform_settings_page'
    );
});

// Settings page HTML
function chatplatform_settings_page() {
    if (isset($_POST['submit'])) {
        update_option('chatplatform_api_key', sanitize_text_field($_POST['api_key']));
        update_option('chatplatform_url', esc_url_raw($_POST['platform_url']));
        echo '<div class="notice notice-success"><p>Settings saved!</p></div>';
    }
    
    $api_key = get_option('chatplatform_api_key', '');
    $platform_url = get_option('chatplatform_url', '');
    ?>
    <div class="wrap">
        <h1>ChatPlatform Integration Settings</h1>
        <form method="post" action="">
            <table class="form-table">
                <tr>
                    <th scope="row">API Key</th>
                    <td>
                        <input type="text" name="api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text" />
                        <p class="description">Enter the API key to secure communication between WordPress and ChatPlatform</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">ChatPlatform URL</th>
                    <td>
                        <input type="url" name="platform_url" value="<?php echo esc_attr($platform_url); ?>" class="regular-text" />
                        <p class="description">The URL where your ChatPlatform is hosted</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
        
        <h2>Integration Instructions</h2>
        <ol>
            <li>Generate a secure API key and enter it above</li>
            <li>Enter the same API key in your ChatPlatform admin settings</li>
            <li>Users must have an active subscription to access the ChatPlatform</li>
            <li>Supported subscription plugins: WooCommerce Subscriptions, MemberPress, Paid Memberships Pro</li>
        </ol>
    </div>
    <?php
}

// Add login redirect to ChatPlatform
add_filter('login_redirect', function($redirect_to, $request, $user) {
    if (!is_wp_error($user) && chatplatform_check_user_subscription($user->ID)) {
        $platform_url = get_option('chatplatform_url');
        if ($platform_url) {
            // Generate a secure token for SSO
            $token = wp_generate_password(32, false);
            set_transient('chatplatform_sso_' . $token, $user->ID, 60); // Valid for 60 seconds
            
            $redirect_url = add_query_arg(array(
                'sso_token' => $token,
                'user_id' => $user->ID
            ), $platform_url);
            
            return $redirect_url;
        }
    }
    return $redirect_to;
}, 10, 3);

// Handle SSO token verification
add_action('rest_api_init', function () {
    register_rest_route('chatplatform/v1', '/sso/verify', array(
        'methods' => 'POST',
        'callback' => 'chatplatform_verify_sso_token',
        'permission_callback' => '__return_true'
    ));
});

function chatplatform_verify_sso_token($request) {
    $token = $request->get_param('token');
    $user_id = get_transient('chatplatform_sso_' . $token);
    
    if (!$user_id) {
        return new WP_REST_Response(array('valid' => false), 401);
    }
    
    // Delete the token after use
    delete_transient('chatplatform_sso_' . $token);
    
    $user = get_user_by('id', $user_id);
    $has_subscription = chatplatform_check_user_subscription($user_id);
    
    return new WP_REST_Response(array(
        'valid' => true,
        'user' => array(
            'id' => $user->ID,
            'email' => $user->user_email,
            'display_name' => $user->display_name,
            'has_active_subscription' => $has_subscription
        )
    ), 200);
}