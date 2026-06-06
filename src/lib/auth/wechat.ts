/**
 * WeChat Open Platform Authentication
 *
 * OAuth2 flow for WeChat login integration.
 * https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
 */

export interface WeChatAccessTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
}

export interface WeChatUserInfo {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  unionid?: string;
}

/**
 * Exchange WeChat authorization code for access token.
 */
export async function exchangeWeChatCode(
  code: string
): Promise<WeChatAccessTokenResponse | null> {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    console.error("[WeChat] WECHAT_APP_ID or WECHAT_APP_SECRET not configured");
    return null;
  }

  try {
    const url = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
    url.searchParams.set("appid", appId);
    url.searchParams.set("secret", appSecret);
    url.searchParams.set("code", code);
    url.searchParams.set("grant_type", "authorization_code");

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.errcode) {
      console.error(`[WeChat] Error ${data.errcode}: ${data.errmsg}`);
      return null;
    }

    return data as WeChatAccessTokenResponse;
  } catch (error) {
    console.error("[WeChat] Failed to exchange code:", error);
    return null;
  }
}

/**
 * Fetch WeChat user info using access token.
 */
export async function getWeChatUserInfo(
  accessToken: string,
  openid: string
): Promise<WeChatUserInfo | null> {
  try {
    const url = new URL("https://api.weixin.qq.com/sns/userinfo");
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("openid", openid);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.errcode) {
      console.error(`[WeChat] Error ${data.errcode}: ${data.errmsg}`);
      return null;
    }

    return data as WeChatUserInfo;
  } catch (error) {
    console.error("[WeChat] Failed to get user info:", error);
    return null;
  }
}
