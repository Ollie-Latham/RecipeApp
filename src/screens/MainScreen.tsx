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

var similarity = require( 'compute-cosine-similarity' );

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

 };
 
 export default class MainScreen extends React.Component<{}, State> {
  constructor(props){
    super(props);
  }
 
  state = {
    userInfo: undefined,
    error: undefined,
    loading:true,
    isFetching:true,

    recipes:[],
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

  async fetchRecipes(){
    try{
      const query = firebase.firestore().collection('Recipes')
    
      const subscriber = query.onSnapshot(querySnapshot => {
        var allRecipes = querySnapshot.docs

        // WILL CONTAIN LIST OF SUGGESTED RECIPES
        var finalRecipes = []

        const groupedMap = this.deepClone(allRecipes).reduce(
          (entryMap, e) => entryMap.set(e.data().poster, [...entryMap.get(e.data().poster) || [], e]),
          new Map()
        );

        // COSINE SIMILARITY ON INGREDIENTS ALGORITHM
        // GET THE RECIPES OF LOGGED IN USER
        const myRecipes = this.deepClone(allRecipes).filter(b=>b.data().likes.includes(this.state.userInfo.user.id))
        .concat(this.deepClone(allRecipes).filter(b=>b.data().dislikes.includes(this.state.userInfo.user.id)));

        // GET THE RECIPES OF OTHER USER
        var otherRecipes = this.deepClone(allRecipes.filter(a => !myRecipes.map(b=>b.data().id).includes(a.data().id)));
        // MAP USER ID'S TO RECIPES
        otherRecipes = this.deepClone(otherRecipes).map(d => ({userId: d.data().poster, data: d.data()}));

        // GROUP RECIPES BY USER ID
        const otherGroupedMap = otherRecipes.reduce((hash, obj) => ({...hash, [obj['userId']]:( hash[obj['userId']] || [] ).concat(obj)}), {})

        // LOOP THROUGH USERS
        for (let userIndex in otherGroupedMap) {
          // WILL CONTAIN RATIO FOR EACH INGREDIENTS FOR USER AND OTHER USER
          var myIngredientRatioList = []
          var otherIngredientRatioList = []

          // ID OF OTHER USER
          let otherUserId = otherGroupedMap[userIndex][0].userId

          // LOOP THROUGH RECIPES OF OTHER USER
          for (let recipeIndex in otherGroupedMap[userIndex]){
            const recipe = otherGroupedMap[userIndex][recipeIndex];
            //LOOP THROUGH INGREDIENTS OF RECIPE
            for (let ingredient of recipe.data.recipeIngredients){
              //CHECK IF INGREDIENT IS IN MY TRIED INGREDIENTS
              const recipeFound = myRecipes.find(r=>r.data().recipeIngredients.includes(ingredient));
              // IF INGREDIENT IN COMMON
              if (recipeFound !=undefined){
                //FIND THE RATIO OF INGREDIENT IN MY LIKE RECIPES COMPARED TO TOTAL TIME INGREDIENT APPEARS
                const myIngredientFrequencyRatio = (myRecipes
                  .filter(r=>r.data().recipeIngredients.includes(ingredient))
                .filter(r=>r.data().likes.includes(this.state.userInfo.user.id)).length)
                /
                (myRecipes.filter(r=>r.data().recipeIngredients.includes(ingredient)).length)

                //FIND THE RATIO OF INGREDIENT IN OTHER USERS LIKE RECIPES COMPARED TO TOTAL TIME INGREDIENT APPEARS
                const otherIngredientFrequencyRatio = (otherGroupedMap[userIndex]
                  .filter(r=>r.data.recipeIngredients.includes(ingredient))
                .filter(r=>r.data.likes.includes(otherUserId)).length)
                /
                (otherGroupedMap[userIndex].filter(r=>r.data.recipeIngredients.includes(ingredient)).length)
                
                console.log(ingredient)
                console.log(parseFloat(otherIngredientFrequencyRatio))
                console.log(parseFloat(myIngredientFrequencyRatio))
                
                //ADD THE RATIOS TO LIST FOR EACH INGREDIENT IN COMMON
                if (parseFloat(myIngredientFrequencyRatio) > 0 && parseFloat(otherIngredientFrequencyRatio) > 0){
                  myIngredientRatioList.push(myIngredientFrequencyRatio)
                  otherIngredientRatioList.push(otherIngredientFrequencyRatio)
                }
              }
            }
          }
          // USE COSINE SIMILARITY TO PRODUCE A SMILARITY VALUE
          var cosineSimilarity = similarity(myIngredientRatioList, otherIngredientRatioList)
          if (cosineSimilarity == null || cosineSimilarity==undefined || cosineSimilarity == NaN){
            cosineSimilarity = 0
          }

          // SUGGEST RECIPES
          const otherUserLikedRecipes = (otherGroupedMap[userIndex]).filter(r=>r.data.likes.includes(otherUserId))
          otherUserLikedRecipes.map(o => o.similarity = cosineSimilarity)
          finalRecipes = finalRecipes.concat(otherUserLikedRecipes)
        }
        //FILTER OUT ALREADY TRIED RECIPES
        finalRecipes = finalRecipes.filter(r=>!r.data.likes.includes(this.state.userInfo.user.id))
        .filter(r=>!r.data.dislikes.includes(this.state.userInfo.user.id))
        .filter(r=>!r.data.neutrals.includes(this.state.userInfo.user.id));


        //SORT RECIPES BY SIMILARITY RATIO
        finalRecipes = finalRecipes.sort(function(a, b) {
          return parseFloat(a.similarity) - parseFloat(b.similarity);
        }).reverse();

        this.setState({recipes:finalRecipes})
        this.setState({loading:false, isFetching:false});
      });
      return () => subscriber();
    }catch (e){
      console.log("ERROR: " + e);
    }
  }

// MACTH ALGORITHM BASED ON LIKES AND DISLIKES
upvoteAlgorithm(groupedMap){
  //LIKE AND DISLIKE MATCH ALGORITHM
        //LOOP THROUGH USERS
        for (const user of groupedMap){
          var countMatch = 0;
          //LOOP THROUGH RECIEPS
          for (const recipe of user[1]){
            //CHECK FOR A LIKE OR DISLIKE MATCH
            if ((recipe.data().likes.includes(this.state.userInfo.user.id)) && (recipe.data().likes.includes(user[0]))){
              //LIKE MATCH
              countMatch++;
            }
            if ((recipe.data().dislikes.includes(this.state.userInfo.user.id)) && (recipe.data().dislikes.includes(user[0]))){
              //DISLIKE MATCH
              countMatch++;
            } 
          }

          //GET FINAL MATCH WITH USER
          const finalMatch = countMatch/(user[1].length)

          //IF FINAL MATCH IS GREATER THAN 0.75, THEN ADD THE USERS RECIPES
          if (finalMatch >= 0.75){
            finalRecipes = finalRecipes.concat(user[1])
          }
        }
}

  onRefresh() {
    this.setState({isFetching: true,},() => {this.fetchRecipes();});
  }
 
  render(){
     if (!this.state.loading){
       return (
       <SafeAreaView style={[styles.container, {backgroundColor:colors.RED}]}>
          <TouchableOpacity style={{justifyContent:'flex-start',flexDirection:'row',width:windowWidth,alignSelf:'center',height:windowHeight/14, backgroundColor:colors.RED}}>
            <Text adjustsFontSizeToFit style={[styles.text, {flex:3,color:colors.WHITE, alignSelf:'center', textAlign:'center'}]}>SUGGESTED RECIPES</Text>
          </TouchableOpacity>
          <View style={{backgroundColor:colors.OFFWHITE, flex:1}}>
          <FlatList
            snapToAlignment={'start'}
            disableIntervalMomentum
            decelerationRate={'normal'}
            pagingEnabled
            snapToInterval={windowHeight - normalize(45) - windowHeight/14}
            onRefresh={() => this.onRefresh()}
            refreshing={this.state.isFetching}
            showsVerticalScrollIndicator={false}
            style={{width:windowWidth,height:windowHeight - normalize(45) - windowHeight/14, backgroundColor:colors.OFFWHITE}}
            data={this.state.recipes}
            renderItem= {({ item, index, separators }) => (
              <RecipeItem 
              recipe={item.data}
              userId={this.state.userInfo.user.id}>

              </RecipeItem>
              )}/>

          </View>
       </SafeAreaView>
       );
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
  
  // SIGN OUT
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
 