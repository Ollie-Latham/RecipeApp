/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, {useState, useEffect} from 'react';
 import {
   SafeAreaView,
   ScrollView,
   StatusBar,
   StyleSheet,
   Text,
   useColorScheme,
   View,
   Image,
   FlatList,
   Dimensions,
   PixelRatio,
   Platform,
   Alert,
   NativeModules,
   Animated,
   ActivityIndicator,
   PermissionsAndroid,
   TouchableOpacity,
   ImageBackground,
   LogBox,
   TextInput
 } from 'react-native';
 
 import config from '../config';

 import {
  GoogleSignin,
  GoogleSigninButton,
  NativeModuleError,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { User } from '@react-native-google-signin/google-signin';

import SearchBar from "react-native-dynamic-search-bar";

import axios from 'react-native-axios';

import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

import RNRestart from 'react-native-restart';

import firestore, { firebase } from '@react-native-firebase/firestore';

import FastImage from 'react-native-fast-image'

import storage from '@react-native-firebase/storage';

import {OptimizedFlatList} from 'react-native-optimized-flatlist'

import firebaseAuth  from '@react-native-firebase/auth'

import deviceInfoModule from 'react-native-device-info';
import colors from '../colors';

import FlipCard from "react-native-flip-card-plus";
import RecipeItem from '../components/RecipeItem';

 var windowWidth = Dimensions.get('window').width;
 var windowHeight = Dimensions.get('window').height;
 
 const scale = windowWidth / 350;
 
 const imageW = windowWidth*0.85;
 const imageH = imageW*1.54;

 const ratio = windowHeight/windowWidth;

 
 export function normalize(size) {
   const newSize = size * scale 
   if (Platform.OS === 'ios') {
     return Math.round(PixelRatio.roundToNearestPixel(newSize))
   } else {
     return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2
   }
 }

LogBox.ignoreLogs(['new NativeEventEmitter']);
 
 type ErrorWithCode = Error & { code?: string };
 
 type State = {
   userInfo?: User;
   error?: ErrorWithCode;
   loading?:boolean;
   isFetching?:boolean;
   view?:string;

   recipes?:object;

   recipeToShow?:object;

   recipeQuery?:string;

   recipeSearchResults?:object;

 };
 
 export default class SearchScreen extends React.Component<{}, State> {
  constructor(props){
    super(props);
  }
 
  state = {
    userInfo: undefined,
    error: undefined,
    loading:true,
    isFetching:true,
    view:'searchview',

    recipes:[],

    recipeToShow:{},

    recipeQuery:'',
    recipeSearchResults:[]
  };
 
  async componentDidMount() {
  await this._configureGoogleSignIn();
  await this._getCurrentUsername(); 

  await this.fetchRecipes();

  this.setState({loading:false})
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

       this.setState({userInfo:undefined});
       this._signOut();
     }
  
  }

  async fetchRecipes(){
    try{
      const query = firebase.firestore().collection('Recipes')
    
      const subscriber = query.onSnapshot(querySnapshot => {
        const recipes = [];
  
        querySnapshot.forEach(recipe => {
          if ((!recipe.data().likes.includes(this.state.userInfo.user.id)) && (!recipe.data().dislikes.includes(this.state.userInfo.user.id))&& (!recipe.data().neutrals.includes(this.state.userInfo.user.id))){
            recipe.data().view = 0
            
            recipes.push({
              ...recipe.data(),
              key: recipe.id,
            });
          }

        });
  
        this.setState({recipes:recipes})
        this.setState({loading:false, isFetching:false});
      });
      return () => subscriber();
    }catch (e){
      console.log("ERROR: " + e);
    }

    
  }

  openRecipe(recipe){
    console.log(this.state.recipes.indexOf(recipe))
    this.setState({recipeToShow:recipe, view:'recipeview'})
  }

  onRefresh() {
    this.setState({isFetching: true,},() => {this.fetchRecipes();});
  }

  renderSearchScreen(){
    return (
      <SafeAreaView style={[styles.container, {backgroundColor:colors.RED}]}>
      <View style={{zIndex:1,justifyContent:'center',flexDirection:'row',width:windowWidth,height:windowHeight/14, backgroundColor:colors.OFFWHITE}}>
      <View style={{justifyContent:'center',flex:1,alignSelf:'center',width:windowWidth,height:windowHeight/14, backgroundColor:colors.RED}}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.text, {padding:normalize(6),color:colors.WHITE, alignSelf:'center',textAlign:'center'}]}>SEARCH RECIPES</Text>
      </View>
      </View>

      <View style={{backgroundColor:colors.OFFWHITE, flex:1}}>
      <SearchBar
      fontColor="#c6c6c6"
      style={{marginTop:normalize(10), height:normalize(18)*ratio}}
      iconColor="#c6c6c6"
      shadowColor="#282828"
      cancelIconColor="#c6c6c6"
      placeholder="Search"
      value={this.state.recipeQuery}
      onChangeText={(text) => {this.handleSearch(text)}}
      onSearchPress={(text) => this.handleSearch(this.state.recipeQuery)}
      onPress={(text) => this.handleSearch(this.state.recipeQuery)}
      onClearPress={() => {this.handleSearch("");this.setState({recipeQuery:""})}}
      //onPress={() => console.log("onPress")}
      />
      <FlatList
          style={{backgroundColor:colors.OFFWHITE,marginBottom:normalize(90), marginTop:normalize(10)}}
          numColumns={3}
          columnWrapperStyle={{justifyContent: "flex-start"}}
          snapToAlignment={'start'}
          decelerationRate={'normal'}
          data={(this.state.recipeQuery.length>0)?this.state.recipeSearchResults:this.state.recipes}
          renderItem={({ item, index, separators }) => (
            <TouchableOpacity onPress={()=>this.openRecipe(item)} style={[styles.listimg,{justifyContent:'center'}]}>
            <FastImage source={{uri:item.recipeImage}} style={{flex:1, borderRadius:normalize(8)}}/>
            </TouchableOpacity>
          )}
          >

        </FlatList>

      </View>
   </SafeAreaView>
    )
  }

  handleSearch = async (text) => {
    this.setState({recipeQuery:text})
    //GET RESULTS
    if (text.length > 0) {
      const searchResults = this.deepClone(this.state.recipes).filter(r=>r.recipeName.slice(0,text.length) == text)
      this.setState({recipeSearchResults:searchResults})
    }else{

    }
  };

  deepClone(obj, hash = new WeakMap()) {
    // Do not try to clone primitives or functions
    if (Object(obj) !== obj || obj instanceof Function) return obj;
    if (hash.has(obj)) return hash.get(obj); // Cyclic reference
    try { // Try to run constructor (without arguments, as we don't know them)
        var result = new obj.constructor();
    } catch(e) { // Constructor failed, create object without running the constructor
        result = Object.create(Object.getPrototypeOf(obj));
    }
    // Optional: support for some standard constructors (extend as desired)
    if (obj instanceof Map)
        Array.from(obj, ([key, val]) => result.set(this.deepClone(key, hash), 
                                                   this.deepClone(val, hash)) );
    else if (obj instanceof Set)
        Array.from(obj, (key) => result.add(this.deepClone(key, hash)) );
    // Register in hash    
    hash.set(obj, result);
    // Clone and assign enumerable own properties recursively
    return Object.assign(result, ...Object.keys(obj).map (
        key => ({ [key]: this.deepClone(obj[key], hash) }) ));
  }
 
  render(){
     if (!this.state.loading){
       if (this.state.view=='searchview'){
        return (
       <SafeAreaView style={[styles.container, {backgroundColor:colors.RED}]}>
          <View style={{zIndex:1,justifyContent:'center',flexDirection:'row',width:windowWidth,height:windowHeight/14, backgroundColor:colors.OFFWHITE}}>
          <View style={{justifyContent:'center',flex:1,alignSelf:'center',width:windowWidth,height:windowHeight/14, backgroundColor:colors.RED}}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.text, {padding:normalize(6),color:colors.WHITE, alignSelf:'center',textAlign:'center'}]}>SEARCH RECIPES</Text>
          </View>
          </View>

          <View style={{backgroundColor:colors.OFFWHITE, flex:1}}>
          <SearchBar
          fontColor="#c6c6c6"
          style={{marginTop:normalize(10), height:normalize(18)*ratio}}
          iconColor="#c6c6c6"
          shadowColor="#282828"
          cancelIconColor="#c6c6c6"
          placeholder="Search"
          value={this.state.recipeQuery}
          onChangeText={(text) => {this.handleSearch(text)}}
          onSearchPress={(text) => this.handleSearch(this.state.recipeQuery)}
          onPress={(text) => this.handleSearch(this.state.recipeQuery)}
          onClearPress={() => {this.handleSearch("");this.setState({recipeQuery:""})}}
          //onPress={() => console.log("onPress")}
          />
          <FlatList
              style={{backgroundColor:colors.OFFWHITE,marginBottom:normalize(90), marginTop:normalize(10)}}
              numColumns={3}
              columnWrapperStyle={{justifyContent: "flex-start"}}
              snapToAlignment={'start'}
              decelerationRate={'normal'}
              data={(this.state.recipeQuery.length>0)?this.state.recipeSearchResults:this.state.recipes}
              renderItem={({ item, index, separators }) => (
                <TouchableOpacity onPress={()=>this.openRecipe(item)} style={[styles.listimg,{justifyContent:'center'}]}>
                <FastImage source={{uri:item.recipeImage}} style={{flex:1, borderRadius:normalize(8)}}/>
                </TouchableOpacity>
              )}
              >

            </FlatList>

          </View>
       </SafeAreaView>
       );
      }else if (this.state.view=='recipeview'){
        
        if (this.state.recipes.indexOf(this.state.recipeToShow) >=0){
          return (
          <SafeAreaView style={[styles.container, {backgroundColor:colors.RED}]}>
          <View style={{zIndex:1,justifyContent:'center',flexDirection:'row',width:windowWidth,height:windowHeight/14, backgroundColor:colors.OFFWHITE}}>
          <View style={{justifyContent:'center',flex:1,alignSelf:'center',width:windowWidth,height:windowHeight/14, backgroundColor:colors.RED}}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.text, {padding:normalize(6),color:colors.WHITE, alignSelf:'center',textAlign:'center'}]}>RECIPE</Text>
          </View>
          </View>
          <TouchableOpacity activeOpacity={1} onPress={()=>this.setState({view:'searchview',recipeToShow:{}})} style={{zIndex:1,position:'absolute',alignSelf:'flex-start',justifyContent:'center',width:windowHeight/12,height:windowHeight/14, backgroundColor:colors.RED}}>
            <Image source={require('../../.assets/next.png')} style={{tintColor:colors.OFFWHITE,width:'100%',alignSelf:'center',height:'100%', transform: [{ scaleX: -0.75}, {scaleY:0.75}]}}></Image>
        </TouchableOpacity>
          <View style={{backgroundColor:colors.OFFWHITE, flex:1}}>
          <FlatList
            snapToAlignment={'start'}
            decelerationRate={'normal'}
            scrollEnabled={false}
            pagingEnabled
            snapToInterval={windowHeight}
            showsVerticalScrollIndicator={false}
            style={{width:windowWidth,height:windowHeight - normalize(45) - windowHeight/14, backgroundColor:colors.OFFWHITE}}
            data={[this.state.recipes[this.state.recipes.indexOf(this.state.recipeToShow)]]}
            renderItem= {({ item, index, separators }) => (
              <RecipeItem 
              recipe={item}
              userId={this.state.userInfo.user.id}>

              </RecipeItem>
              )}/>
          </View>
          </SafeAreaView>
        )
      }else{
        return (
          this.renderSearchScreen()
          );

      }
    }else{
        return (
          <SafeAreaView style={[styles.container, {justifyContent:'flex-start', backgroundColor:colors.RED}]}>
            <View style={{justifyContent:'flex-start',flexDirection:'row',width:windowWidth,alignSelf:'center',height:windowHeight/14, backgroundColor:colors.RED, marginBottom:normalize(4)}}>
              <Text adjustsFontSizeToFit style={[styles.text, {padding:normalize(6),flex:3,color:colors.WHITE, alignSelf:'center', textAlign:'center'}]}>LOADING</Text>
            </View>
            <View style={{justifyContent:'center',position:'absolute',zIndex:105,height:windowHeight,width:windowWidth,backgroundColor:colors.OFFWHITE,opacity:1}}>
              <ActivityIndicator  color={colors.RED} size={'large'} animating={true} style={{alignSelf:'center'}}/>
            </View>
          </SafeAreaView>
        )
      }
    }
  }
  
  _signOut = async () => {
    try {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();

        RNRestart.Restart();
    } catch (error) {
        console.log(error)
    }
  };
}
 
 const styles = StyleSheet.create({
   container: {
     backgroundColor:colors.WHITE,
     flex: 1,
   },
   text:{
    fontSize:normalize(20),
    color:colors.BLUE
   },
   listimg:{
    flex: 1/3, 
    borderRadius:normalize(15),
    height:(windowWidth/3)*1.54,
    width:(windowWidth/3),
    backgroundColor:'transparent',
    padding:normalize(4)
  },
  button:{
    color:colors.WHITE,
    alignSelf:'center',
    fontSize:normalize(25),
    paddingRight:normalize(20),
    paddingLeft:normalize(20),
    paddingBottom:normalize(6)
  },
  buttonview:{
    alignSelf:'center',
    backgroundColor:colors.RED,
    borderRadius:normalize(10)
  },
 });
 