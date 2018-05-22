package com.relevantnative;

import android.app.Application;
import android.util.Log;

import com.facebook.react.ReactApplication;
import com.brentvatne.react.ReactVideoPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.goldenowl.twittersignin.TwitterSigninPackage;
import com.github.alinz.rnsk.RNSKPackage;
import com.horcrux.svg.SvgPackage;
import com.meedan.ShareMenuPackage;
import com.alinz.parkerdan.shareextension.SharePackage;
import cl.json.RNSharePackage;
import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage;
import com.github.yamill.orientation.OrientationPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.imagepicker.ImagePickerPackage;
import com.evollu.react.fa.FIRAnalyticsPackage;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.rt2zz.reactnativecontacts.ReactNativeContacts;
import com.gnet.bottomsheet.RNBottomSheetPackage;
import com.goldenowl.twittersignin.TwitterSigninPackage;
import com.microsoft.codepush.react.CodePush;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.brentvatne.react.ReactVideoPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.horcrux.svg.SvgPackage;
import com.meedan.ShareMenuPackage;
import com.alinz.parkerdan.shareextension.SharePackage;
import cl.json.RNSharePackage;
import com.imagepicker.ImagePickerPackage;
import com.rt2zz.reactnativecontacts.ReactNativeContacts;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.evollu.react.fa.FIRAnalyticsPackage;
import com.github.alinz.rnsk.RNSKPackage;
import com.gnet.bottomsheet.RNBottomSheetPackage;
import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage;
import com.github.yamill.orientation.OrientationPackage;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {

    @Override
    protected String getJSBundleFile() {
      return CodePush.getJSBundleFile();
    }

    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new ReactVideoPackage(),
            new VectorIconsPackage(),
            new TwitterSigninPackage(),
            new RNSKPackage(),
            new SvgPackage(),
            new ShareMenuPackage(),
            new SharePackage(),
            new RNSharePackage(),
            new ReactNativePushNotificationPackage(),
            new OrientationPackage(),
            new LinearGradientPackage(),
            new ImagePickerPackage(),
            new FIRAnalyticsPackage(),
            new RNFetchBlobPackage(),
            new ReactNativeContacts(),
            new RNBottomSheetPackage(),
          new TwitterSigninPackage(),
          new CodePush(BuildConfig.CODEPUSH_KEY, getApplicationContext(), BuildConfig.DEBUG), // Add/change this line.
          new RNFetchBlobPackage(),
          new ReactNativePushNotificationPackage(),
          new VectorIconsPackage(),
          new ReactVideoPackage(),
          new LinearGradientPackage(),
          new SvgPackage(),
          new ShareMenuPackage(),
          new SharePackage(),
          new RNSharePackage(),
          new ImagePickerPackage(),
          new FIRAnalyticsPackage(),
          new ReactNativeContacts(),
          new RNSKPackage(),
          new RNBottomSheetPackage(),
          new OrientationPackage()
        );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
