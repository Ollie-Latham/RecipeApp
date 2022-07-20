import * as React from 'react';
import { Text, View, Image, Dimensions, StatusBar,PixelRatio, AppState, Alert, ActivityIndicator, } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {LogBox} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import MainScreen from './src/screens/MainScreen';
import SearchScreen from './src/screens/SearchScreen';
import AccountScreen from './src/screens/ProfileScreen';
import {
  GoogleSignin,
  GoogleSigninButton,
  NativeModuleError,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import config from './src/config';
import RNRestart from 'react-native-restart';

import firestore, { firebase } from '@react-native-firebase/firestore';
 
import firebaseAuth  from '@react-native-firebase/auth'

import deviceInfoModule from 'react-native-device-info';
import colors from './src/colors';


function HomeScreen() {
  return (
    <MainScreen></MainScreen>
  );
}

function ListScreen() {
  return (
    <SearchScreen></SearchScreen>
  );
}

function ProfileScreen() {
  return (
    <AccountScreen></AccountScreen>
  );
}

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;
const screenHeight = Dimensions.get('screen').height;

const scale = windowWidth / 350;

export function normalize(size) {
  const newSize = size * scale 
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize))
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2
  }
}

const Tab = createBottomTabNavigator();

LogBox.ignoreLogs([
"ViewPropTypes will be removed",
"ColorPropType will be removed",
])

type State = {
  userInfo?: User;
  error?: ErrorWithCode;
  loading?:boolean;
  isSignedIn?:boolean;
};

export default class App extends React.Component<{}, State> {
  constructor(props){
    super(props);
  }

  state = {
    userInfo: undefined,
    error: undefined,
    loading:true,
    isSignedIn:false,
  };

  async componentDidMount(){
    await this._configureGoogleSignIn();
    const isSignedIn = await GoogleSignin.isSignedIn();
    this.setState({isSignedIn:isSignedIn,loading:false});
  }

  async _configureGoogleSignIn() {
    GoogleSignin.configure({
      webClientId: config.webClientId,
      offlineAccess: false,
    });
  }

  async _getCurrentUsername() {
    try {
      const userInfo = await GoogleSignin.signInSilently();
      const thisUser = await firestore().collection('Users').doc(userInfo.user.id).get();

      this.setState({userInfo:userInfo});
    } catch (error) {
       console.log(error)
    }
  }

  _signIn = async () => {
    var date = new Date();
    var dateStr =
      ("00" + (date.getMonth() + 1)).slice(-2) + "/" +
      ("00" + date.getDate()).slice(-2) + "/" +
      date.getFullYear() + " " +
      ("00" + (date.getHours()-1)).slice(-2) + ":" +
      ("00" + date.getMinutes()).slice(-2) + ":" +
      ("00" + date.getSeconds()).slice(-2);
      try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        this.setState({loading:true})
        //const { serverAuthCode, idToken, user} = await GoogleSignin.signIn();
        const credential = firebaseAuth.GoogleAuthProvider.credential(
          userInfo.idToken,
          userInfo.serverAuthCode
        )
        // login with credential
        await firebase.auth().signInWithCredential(credential)

        const doc = await firestore().collection("Users").doc(userInfo.user.id).get();
          if (doc.exists){
            console.log("User already signed up!");
          }else{
            //ADD USER TO FIREBASE
            firestore()
            .collection('Users')
            .doc(userInfo.user.id)
            .set({
              id:userInfo.user.id,
              name:userInfo.user.name,
              email:userInfo.user.email,
            }).then(function() {
              console.log("User signed up!");
            })
            .catch(function(error) {
              console.error("Error signing up user: ", error);
            });
          }
        RNRestart.Restart();
      } catch (error) {
        console.log(error)
        this.setState({loading:false})
      }

  };

  render(){
    if (this.state.isSignedIn){
      return (
        <NavigationContainer style={{flex:1}}>
          <StatusBar hidden={true}/>
          <Tab.Navigator 
          initialRouteName='HomeScreen'
          screenOptions={{headerShown: false,tabBarActiveTintColor:colors.WHITE,tabBarInactiveTintColor:colors.WHITE,tabBarStyle: {
          height: normalize(45),
          backgroundColor:colors.RED,
          paddingBottom:normalize(7),
          paddingTop:normalize(7),
          borderTopWidth: 0
          },}}>

          <Tab.Screen
              name="ListScreen"
              component={ListScreen}
              options={{
                title: 'Search',
                tabBarIcon: ({size,focused,color}) => {
                  return (
                    <Image
                      style={{ width: size, height: size, tintColor:(focused)?colors.WHITE:colors.OFFWHITE}}
                      source={require("./.assets/search.png")}
                    />
                  );
                },
              }}
            />
            <Tab.Screen
              name="HomeScreen"
              component={HomeScreen}
              options={{
                title: 'Discover',
                tabBarIcon: ({size,focused,color}) => {
                  return (
                    <Image
                      style={{ width: size, height: size ,tintColor:(focused)?colors.WHITE:colors.OFFWHITE}}
                      source={require("./.assets/chef.png")}
                    />
                  );
                },
              }}
            />

            <Tab.Screen
              name="ProfileScreen"
              component={ProfileScreen}
              options={{
                title: 'Profile',
                tabBarIcon: ({size,focused,color}) => {
                  return (
                    <Image
                      style={{ width: size, height: size, tintColor:(focused)?colors.WHITE:colors.OFFWHITE}}
                      source={require("./.assets/user.png")}
                    />
                  );
                },
              }}
            />
    
          </Tab.Navigator>
        </NavigationContainer>
      );
    }else{
      return(
        <SafeAreaView style={[styles.container, {justifyContent:'flex-end',backgroundColor:colors.OFFWHITE}]}>

          {(!this.state.loading) && (
            <View>
          <Image source={require('./.assets/chef.png')} style={{width:windowWidth/2,height:windowWidth/2, alignSelf:'center',tintColor:colors.RED}}></Image>
          <Text style={{alignSelf:'center', marginBottom:windowWidth/2, color:colors.RED, fontSize:normalize(35), fontWeight:'bold'}}>Recipe App</Text>
          <GoogleSigninButton
          size={GoogleSigninButton.Size.Standard}
          color={GoogleSigninButton.Color.Light}
          onPress={this._signIn}
          style={{alignSelf:'center',marginBottom:normalize(45)}}
        />
            </View>

          )}
          {(this.state.loading) && (
            <View style={{justifyContent:'center',position:'absolute',zIndex:105,height:windowHeight,width:windowWidth,backgroundColor:'transparent',opacity:1}}>
            <ActivityIndicator  color={colors.RED} size={'large'} animating={true} style={{alignSelf:'center'}}/>
          </View>
          )}
        </SafeAreaView>
      );
    }
  }

}

const styles = StyleSheet.create({
  container: {
    backgroundColor:'white',
    flex: 1,
  },
});