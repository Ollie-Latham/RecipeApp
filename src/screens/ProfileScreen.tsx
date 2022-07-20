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
   Switch,
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
import RecipeItem from '../components/RecipeItem';

import RNFS from 'react-native-fs';

import vision from "react-cloud-vision-api";

//

vision.init({ auth: config.apiKey})

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

   myRecipes?:object;
   recipeSearchItems?:object;

   recipeQuery?:string;

   allRecipes?:object;

   instructionInput?:string;

   stepView?:number;

   imageInput?:string;
   titleInput?:string;
   recipeIngredientsInput?:object;
   recipeLiked?:string;

   recipeIngredients?:object;
   recipeIngredientsSearchResult?:object;

   ingredientsQuery?:object,

   recipeInstructionsInput?:object;


 };
 
 export default class ProfileScreen extends React.Component<{}, State> {
  constructor(props){
    super(props);
  }
 
  state = {
    userInfo: undefined,
    error: undefined,
    loading:true,
    isFetching:true,
    view:'profileview',

    myRecipes:[],
    recipeSearchItems:[],

    allRecipes:[],

    recipeIngredients:[],
    recipeIngredientsSearchResult:[],

    recipeQuery:'',

    ingredientsQuery:'',

    instructionInput:'',

    stepView:0,

    imageInput: require("../../.assets/camera.png"),
    titleInput:'',
    recipeIngredientsInput:[],
    recipeLiked:true,

    recipeInstructionsInput:[],


  };
 
  async componentDidMount() {
  await this._configureGoogleSignIn();
  await this._getCurrentUsername(); 

  await this.fetchMyRecipes();

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

  askReadPermission = async () => {
    try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: "Allow Read Permission",
            message:
              "",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log("You can use the camera");
        } else {
          console.log("Camera permission denied");
        }
      } catch (err) {
        console.warn(err);
      }
  }
  
  askCameraPermission = async () => {
    try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Allow Camera Permission",
            message:
              "",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log("You can use the camera");
        } else {
          console.log("Camera permission denied");
        }
      } catch (err) {
        console.warn(err);
      }
  }

  onTakePhoto = () => launchCamera({ mediaType: 'photo', quality:0.2 }, this.onMediaSelect);

  onSelectPhoto = () => launchImageLibrary({ mediaType: 'photo', quality:0.2 }, this.onMediaSelect);


  onMediaSelect = async (media) => {
    this.askReadPermission();
    this.askCameraPermission();
    this.setState({loading:true});

    try{
      this.setState({imageInput:media.assets[0]});
    }catch{
      this.setState({imageInput:require("../../.assets/camera.png")});
    }
    this.setState({loading:false})

    // Read the file into memory.
/*     var data = await RNFS.readFile(media.assets[0].uri, 'base64').then(res => {
      this.callGoogleVIsionApi(res, media.assets[0])
    }); */

  };

  callGoogleVIsionApi = async (base64, image) => {
    let googleVisionRes = await fetch(config.api + config.apiKey, {
        method: 'POST',
        body: JSON.stringify({
            "requests": [
                {
                    "image": {
                        "content": base64
                    },
                    features: [
                        { type: "LABEL_DETECTION", maxResults: 1 },
                        // { type: "LANDMARK_DETECTION", maxResults: 5 },
                        // { type: "FACE_DETECTION", maxResults: 5 },
                        // { type: "LOGO_DETECTION", maxResults: 5 },
                        // { type: "TEXT_DETECTION", maxResults: 5 },
                        // { type: "DOCUMENT_TEXT_DETECTION", maxResults: 5 },
                        // { type: "SAFE_SEARCH_DETECTION", maxResults: 5 },
                        // { type: "IMAGE_PROPERTIES", maxResults: 5 },
                        // { type: "CROP_HINTS", maxResults: 5 },
                        // { type: "WEB_DETECTION", maxResults: 5 }
                    ],
                }
            ]
        })
    });

    await googleVisionRes.json()
        .then(googleVisionRes => {
          console.log(googleVisionRes.responses[0].labelAnnotations[0])
          if (googleVisionRes.responses[0].labelAnnotations[0].description == 'Food'){
            console.log('Food')
            try{
              this.setState({imageInput:image});
            }catch{
              this.setState({imageInput:require("../../.assets/camera.png")});
            }
          }else{
            console.log('Not Food')
            this.setState({imageInput:require("../../.assets/camera.png")});

          }
        }).catch((error) => {
          console.log(error)
        })
    this.setState({loading:false})
}

  async fetchMyRecipes(){
    try{
      const query = firebase.firestore().collection('Recipes')
    
      const subscriber = query.onSnapshot(querySnapshot => {
        const recipes = [];
        var ingredients = [];

        const allRecipes = querySnapshot.docs;
  
        querySnapshot.forEach(recipe => {
          try{
            for (const ingredient of recipe.data().recipeIngredients){
              ingredients.push(ingredient)
            }
          }catch{
            ingredients = []
          }

          if ((recipe.data().likes.includes(this.state.userInfo.user.id)) || (recipe.data().dislikes.includes(this.state.userInfo.user.id))|| (recipe.data().neutrals.includes(this.state.userInfo.user.id))){
            recipes.push({
              ...recipe.data(),
              key: recipe.id,
            });
          }

        });

        this.setState({allRecipes:allRecipes})
        this.setState({myRecipes:recipes, recipeIngredients:ingredients})
        this.setState({loading:false, isFetching:false});

      });
      return () => subscriber();
    }catch (e){
      console.log("ERROR: " + e);
    }
  }

  onRefresh() {
    this.setState({isFetching: true,},() => {this.fetchMyRecipes();});
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

  async addRecipe(){
    this.setState({loading:true})
    var date = new Date();
    var dateStr =
      ("00" + (date.getMonth() + 1)).slice(-2) + "/" +
      ("00" + date.getDate()).slice(-2) + "/" +
      date.getFullYear() + " " +
      ("00" + date.getHours()).slice(-2) + ":" +
      ("00" + date.getMinutes()).slice(-2) + ":" +
      ("00" + date.getSeconds()).slice(-2);

    const auto_id = firestore().collection('Recipes').doc().id;
     
    //UPLOAD FILE
    const reference = storage().ref("/recipe_images/"+auto_id);
    const pathToFile = this.state.imageInput.uri;
    const task = await reference.putFile(pathToFile);
    const image_url = await firebase.storage().ref("/recipe_images/"+auto_id).getDownloadURL();

    var likes = []
    var dislikes = []
    if (this.state.likedRecipe){
      likes = [this.state.userInfo.user.id]
    }else{
      dislikes = [this.state.userInfo.user.id]
    }
    await firebase.firestore().collection('Recipes').doc(auto_id).set({
      id:auto_id,
      datePosted:Date.parse(dateStr),
      poster:this.state.userInfo.user.id,
      recipeName:this.state.titleInput,
      recipeImage:image_url,
      recipeIngredients:this.state.recipeIngredientsInput,
      recipeInstructions:this.state.recipeInstructionsInput,
      likes:likes,
      dislikes:dislikes,
      neutrals:[]
    });

    RNFS.readFile(pathToFile, 'base64')
    .then(res =>{
      console.log(res);
      const req = new vision.Request({
        image: new vision.Image({
          base64: res,
        }),
        features: [
          new vision.Feature('TEXT_DETECTION', 4),
          new vision.Feature('LABEL_DETECTION', 10),
        ]
      })
    });

    this.setState({imageInput:require("../../.assets/camera.png"),titleInput:'',recipeQuery:'',ingredientsQuery:'',stepView:0,recipeIngredientsInput:[],recipeIngredientsSearchResult:[],recipeSearchItems:[],view:'profileview',loading:false})
  }


  nextClicked(){
    this._getCurrentUsername();
    if (this.state.googleId == "Not Logged In"){
      alert("Please Login To Post");
    }else{
      if (this.state.stepView<4){
        switch (this.state.stepView){
          case 0:
            if (this.state.imageInput == require("../../.assets/camera.png")){
              alert("Take a photo to continue");
            }else{
              this.setState({stepView:this.state.stepView+1})
            }
            break;
          case 1:
            if ((this.state.titleInput.length <= 0) 
            ){
              alert("Fill out all fields to continue");
            }else{
              this.setState({stepView:this.state.stepView+1})
            }
            break;
          case 2:
            if ((this.state.recipeIngredientsInput.length <= 0) 
            ){
              alert("Fill out all fields to continue");
            }else{
              this.setState({stepView:this.state.stepView+1})
            }
            break;
          case 3:
              this.setState({stepView:this.state.stepView+1})
            break;
        }
        //this.setState({stepView:this.state.stepView+1})
      }
    }
    
  }

  backClicked(){
    if (this.state.stepView<=3){
      this.setState({stepView:this.state.stepView-1})
    }
  }

  handleRecipeSearch = async (text=this.state.recipeQuery) => {
    this.setState({recipeQuery:text})
    //GET RESULTS
    if (text.length > 0) {
      const searchResults = this.deepClone(this.state.allRecipes).filter(r=>r.data().recipeName.slice(0,text.length) == text)
      //const unique = [...new Map(searchResults.map((item, key) => [item[key], item])).values()]
      const unique = searchResults.filter((v,i,a)=>a.findIndex(v2=>(v.data().recipeName === v2.data().recipeName))===i)

      this.setState({recipeSearchItems:unique})
    }else{
      this.setState({recipeSearchItems:[]})
    }
  };


  handleIngredientSearch = async (text=this.state.ingredientsQuery) => {
    this.setState({ingredientsQuery:text})
    //GET RESULTS
    if (text.length > 0) {
      const searchResults = this.deepClone(this.state.recipeIngredients).filter(i=>i.slice(0,text.length) == text).filter(i=>!this.state.recipeIngredientsInput.includes(i))
      const unique = searchResults.filter((v,i,a)=>a.findIndex(v2=>(v === v2))===i)
      this.setState({recipeIngredientsSearchResult:unique})
    }else{

    }
  };

  addIngredient(ingredient=this.state.ingredientsQuery){
    let ingredients = this.state.recipeIngredientsInput

    ingredients.push(ingredient.trim())

    this.handleIngredientSearch()
    this.setState({recipeIngredientsInput:ingredients})
    this.setState({ingredientsQuery:''})

    console.log(this.state.recipeIngredientsInput)
  }

  removeIngredient(ingredient){
    let ingredients = this.state.recipeIngredientsInput

    ingredients = ingredients.filter(i=>i!=ingredient)

    this.setState({recipeIngredientsInput:ingredients})

    this.setState({ingredientsQuery:''})
    this.handleIngredientSearch()
  }

  addInstruction(instruction){
    let instructions = this.state.recipeInstructionsInput

    var isValid = false;
    if (instruction.length>0){
      for (const ingredient of this.state.recipeIngredientsInput){
        if (instruction.toLowerCase().includes(ingredient.toLowerCase())){
          isValid = true;
        }
      }
      if (isValid){
        instructions.push(instruction.trim())
      }
    }


    this.setState({recipeInstructionsInput:instructions, instructionInput:''})
  }

  removeInstruction(instruction){
    let instructions = this.state.recipeInstructionsInput

    instructions = instructions.filter(i=>i!=instruction)
    this.setState({recipeInstructionsInput:instructions})

  }
 
  render(){
     if (!this.state.loading && this.state.view =='profileview'){
       return (
       <SafeAreaView style={[styles.container, {backgroundColor:colors.RED}]}>
          <View style={{zIndex:1,justifyContent:'center',flexDirection:'row',width:windowWidth,height:windowHeight/14, backgroundColor:colors.OFFWHITE}}>
          <TouchableOpacity onLongPress={async () => await this._signOut()} style={{justifyContent:'flex-start',flexDirection:'row',width:windowWidth,alignSelf:'center',height:windowHeight/14, backgroundColor:colors.RED}}>
            <Text adjustsFontSizeToFit style={[styles.text, {padding:normalize(6),flex:3,color:colors.WHITE, alignSelf:'center', textAlign:'center'}]}>MY RECIPES</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>this.setState({view:'addview'})} style={{zIndex:1,position:'absolute',backgroundColor:'transparent',width:windowWidth/10,height:windowWidth/10,right:normalize(10),alignSelf:'center'}}>
              <Image source={require('../../.assets/plus.png')} style={{tintColor:colors.OFFWHITE,width:'100%',height:'100%'}}></Image>
            </TouchableOpacity>
          </View>

          <View style={{backgroundColor:colors.OFFWHITE, flex:1}}>
          <FlatList
            snapToAlignment={'start'}
            decelerationRate={'normal'}
            pagingEnabled
            disableIntervalMomentum
            snapToInterval={windowHeight - normalize(45) - windowHeight/14}
            onRefresh={() => this.onRefresh()}
            refreshing={this.state.isFetching}
            showsVerticalScrollIndicator={false}
            style={{width:windowWidth,height:windowHeight - normalize(45) - windowHeight/14, backgroundColor:'transparent'}}
            data={this.state.myRecipes}
            renderItem= {({ item, index, separators }) => (
              <RecipeItem 
              recipe={item}
              userId={this.state.userInfo.user.id}
              >

              </RecipeItem>
            )}/>

          </View>
       </SafeAreaView>
       );
     }else if (!this.state.loading && this.state.view =='addview'){
      return (
        <SafeAreaView style={[styles.container, {backgroundColor:colors.RED}]}>
          {/* TITLE AND BACK BUTTON */}
          <View style={{zIndex:1,justifyContent:'center',flexDirection:'row',width:windowWidth,height:windowHeight/14, backgroundColor:colors.OFFWHITE}}>
          <View style={{justifyContent:'center',flex:1,alignSelf:'center',width:windowWidth,height:windowHeight/14, backgroundColor:colors.RED}}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.text, {padding:normalize(6),color:colors.WHITE, alignSelf:'center',textAlign:'center'}]}>{'Add a Recipe ' + this.state.stepView}</Text>
          </View>
          </View>
          <TouchableOpacity activeOpacity={1} onPress={()=>this.setState({view:'profileview'})} style={{zIndex:1,position:'absolute',alignSelf:'flex-start',justifyContent:'center',width:windowHeight/12,height:windowHeight/14, backgroundColor:colors.RED}}>
              <Image source={require('../../.assets/next.png')} style={{tintColor:colors.OFFWHITE,width:'100%',alignSelf:'center',height:'100%', transform: [{ scaleX: -0.75}, {scaleY:0.75}]}}></Image>
          </TouchableOpacity>

          {(this.state.stepView == 0) && (
            <View style={[styles.container, {justifyContent:'center', backgroundColor:colors.OFFWHITE}]}>
          <TouchableOpacity onLongPress={()=>this.onSelectPhoto()} onPress={() => this.onTakePhoto()} style={[styles.buttonview, {backgroundColor:colors.OFFWHITE, flex:1}]}>
            <Image source={this.state.imageInput} style={[{flex:1, height:windowHeight, width:windowWidth, alignSelf:'center'}]}></Image>
          </TouchableOpacity>
          </View>
          )}
          
          {(this.state.stepView == 1) && (
            <View style={[styles.container, {justifyContent:'flex-start', backgroundColor:colors.OFFWHITE}]}>
          <SearchBar
          fontColor="#c6c6c6"
          style={{marginTop:normalize(10), height:normalize(18)*ratio}}
          iconColor="#c6c6c6"
          shadowColor="#282828"
          cancelIconColor="#c6c6c6"
          placeholder="Search"
          value={this.state.recipeQuery}
          onChangeText={(text) => {this.handleRecipeSearch(text)}}
          clearIconComponent={(
            <Image source={require('../../.assets/plus.png')} style={{tintColor:colors.RED,width:normalize(20),height:normalize(20)}}></Image>
          )}
          onClearPress={() => {this.setState({titleInput:this.state.recipeQuery, recipeQuery:'', recipeSearchItems:[]});this.handleRecipeSearch('')}}
          //onPress={() => console.log("onPress")}
          />
          <FlatList
              style={{backgroundColor:colors.WHITE, width:windowWidth*0.9, marginTop:normalize(5), marginBottom:normalize(15),borderRadius:normalize(8),alignSelf:'center', flexGrow:0}}
              snapToAlignment={'start'}
              decelerationRate={'normal'}
              data={(this.state.recipeSearchItems.length>0)?this.state.recipeSearchItems:[]}
              renderItem={({ item, index, separators }) => (
                <TouchableOpacity onPress={()=>{this.setState({titleInput:item.data().recipeName, recipeQuery:'', recipeSearchItems:[]});this.handleRecipeSearch('')}} style={{justifyContent:'center', alignSelf:'center',width:'100%', height:windowHeight/14}}>
                  <Text style={{alignSelf:'center', color:colors.RED, fontSize:normalize(20)}}>{item.data().recipeName}</Text>
                </TouchableOpacity>
              )}
              >
            </FlatList>

            <Text style={{alignSelf:'center', fontSize:normalize(25),fontWeight:'bold', color:colors.RED}}>Selected Recipe</Text>
            <Text style={{alignSelf:'center', fontSize:normalize(18), color:colors.RED}}>{(this.state.titleInput.length>0)?this.state.titleInput:'None'}</Text>


        </View>
          )}

          {(this.state.stepView == 2) && (
            <View style={[styles.container, {justifyContent:'flex-start', backgroundColor:colors.OFFWHITE}]}>
          <SearchBar
          fontColor="#c6c6c6"
          style={{marginTop:normalize(10), height:normalize(18)*ratio}}
          iconColor="#c6c6c6"
          shadowColor="#282828"
          cancelIconColor="#c6c6c6"
          placeholder="Search"
          value={this.state.ingredientsQuery}
          onChangeText={(text) => {this.handleIngredientSearch(text)}}
          // onSearchPress={(text) => this.handleIngredientSearch(this.state.ingredientsQuery)}
          // onPress={(text) => this.handleIngredientSearch(this.state.ingredientsQuery)}
          clearIconComponent={(
            <Image source={require('../../.assets/plus.png')} style={{tintColor:colors.RED,width:normalize(20),height:normalize(20)}}></Image>
          )}
          onClearPress={() => {this.addIngredient()}}
          //onPress={() => console.log("onPress")}
          />
          <FlatList
              style={{backgroundColor:colors.WHITE, width:windowWidth*0.9, marginTop:normalize(5), marginBottom:normalize(15),borderRadius:normalize(8),alignSelf:'center', flexGrow:0}}
              snapToAlignment={'start'}
              decelerationRate={'normal'}
              data={(this.state.ingredientsQuery.length>0)?this.state.recipeIngredientsSearchResult:[]}
              renderItem={({ item, index, separators }) => (
                <TouchableOpacity onPress={()=>this.addIngredient(item)} style={{justifyContent:'center', alignSelf:'center',width:'100%', height:windowHeight/14}}>
                  <Text style={{alignSelf:'center', color:colors.RED, fontSize:normalize(20)}}>{item}</Text>
                </TouchableOpacity>
              )}
              >
            </FlatList>
            <Text style={{alignSelf:'center', fontSize:normalize(20), color:colors.RED, fontWeight:'bold'}}>Added Ingredients</Text>
            <FlatList
              style={{backgroundColor:colors.OFFWHITE,marginBottom:normalize(90), marginTop:normalize(10), flexGrow:0}}
              snapToAlignment={'start'}
              decelerationRate={'normal'}
              data={this.state.recipeIngredientsInput}
              renderItem={({ item, index, separators }) => (
                <TouchableOpacity onPress={()=>this.removeIngredient(item)} style={{justifyContent:'center', width:windowWidth, height:windowHeight/12}}>
                  <Text style={{alignSelf:'center', color:colors.RED, fontSize:normalize(20)}}>{item}</Text>
                </TouchableOpacity>
              )}
              >
            </FlatList>
        </View>
          )}

          {(this.state.stepView == 3) && (
            <View style={[styles.container, {justifyContent:'center', backgroundColor:colors.OFFWHITE}]}>
              <Text style={{alignSelf:'center', fontSize:normalize(25),fontWeight:'bold', color:colors.RED}}>Did You Like This Recipe?</Text>
            <Switch thumbColor={colors.RED} style={{alignSelf:'center', marginTop:normalize(10)}} value={this.state.recipeLiked} onValueChange={()=>{this.setState({recipeLiked:!this.state.recipeLiked})}}/>

            </View>
          )}

        {(this.state.stepView == 4) && (
          <View style={[styles.container, {justifyContent:'flex-start', backgroundColor:colors.OFFWHITE}]}>
          <Text style={{alignSelf:'center', fontSize:normalize(20), color:colors.RED, fontWeight:'bold'}}>Your Ingredients</Text>
            <FlatList
              style={{backgroundColor:colors.OFFWHITE,marginBottom:normalize(10), marginTop:normalize(10), flexGrow:0, height:windowHeight/5}}
              snapToAlignment={'start'}
              decelerationRate={'normal'}
              data={this.state.recipeIngredientsInput}
              renderItem={({ item, index, separators }) => (
                <TouchableOpacity onPress={{}} style={{justifyContent:'center', width:windowWidth, height:windowHeight/18}}>
                  <Text style={{alignSelf:'center', color:colors.RED, fontSize:normalize(20)}}>{item}</Text>
                </TouchableOpacity>
              )}
              >
            </FlatList>
            <Text style={{alignSelf:'center', fontSize:normalize(20), color:colors.RED, fontWeight:'bold'}}>Instructions</Text>
            <View style={{flexDirection:'row', alignSelf:'center', width:windowWidth*0.95, borderRadius:normalize(8)}}>
            <TextInput 
            onChangeText={(text)=>this.setState({instructionInput:text})}
            placeholder={'Instruction'}
            style={{alignSelf:'flex-start', paddingLeft:windowWidth*0.1,textAlign:'center',fontSize:normalize(20), color:colors.WHITE, backgroundColor:colors.RED, width:(windowWidth)-windowWidth*0.05-normalize(40), height:windowHeight/14, borderTopLeftRadius:normalize(8), borderBottomLeftRadius:normalize(8)}}>

            </TextInput>
            <TouchableOpacity activeOpacity={1} onPress={()=>this.addInstruction(this.state.instructionInput)} style={{justifyContent:'center', alignSelf:'flex-end',width:normalize(40), height:windowHeight/14, backgroundColor:colors.RED, borderTopRightRadius:normalize(8), borderBottomRightRadius:normalize(8)}}>
            <Image source={require('../../.assets/plus.png')} style={{tintColor:colors.OFFWHITE,alignSelf:'center',marginRight:windowWidth*0.05,width:normalize(40),height:normalize(40)}}></Image>
                </TouchableOpacity>
            </View>

            <FlatList
              style={{backgroundColor:colors.OFFWHITE, marginTop:normalize(10), marginBottom:windowHeight/10-normalize(20), flexGrow:0}}
              snapToAlignment={'start'}
              decelerationRate={'normal'}
              data={this.state.recipeInstructionsInput}
              renderItem={({ item, index, separators }) => (
                <TouchableOpacity onPress={()=>this.removeInstruction(item)} style={{justifyContent:'center', width:windowWidth, height:windowHeight/18}}>
                  <Text style={{alignSelf:'center', color:colors.RED, fontSize:normalize(20)}}>{item}</Text>
                </TouchableOpacity>
              )}
              >
            </FlatList>
          </View>
        )}
      <View style={[{justifyContent:'flex-end', flex:1,flexDirection:'row',marginBottom:normalize(20),position:'absolute', bottom:0}]}>
        {(this.state.stepView > 0) && (
          <View style={{justifyContent:'flex-end', flex:1}}> 
          <TouchableOpacity onPress={() => {this.backClicked()}}
            style={[styles.buttonview,{alignSelf:'flex-start',marginLeft:normalize(18)}]}>
            <Text style={styles.button}>Back</Text>
          </TouchableOpacity>
          </View>
        )}
        {(this.state.stepView < 4) && (
          <View style={{justifyContent:'flex-end', flex:1}}> 
          <TouchableOpacity onPress={() => {this.nextClicked()}}
          style={[styles.buttonview,{alignSelf:'flex-end',marginRight:normalize(18)}]}>
            <Text style={styles.button}>Next</Text>
          </TouchableOpacity>
          </View>
        )}
          {(this.state.stepView == 4) && (
          <View style={{justifyContent:'flex-end', flex:1}}> 
          <TouchableOpacity onPress={() => {this.addRecipe()}}
          style={[styles.buttonview,{alignSelf:'flex-end',marginRight:normalize(18)}]}>
            <Text style={styles.button}>Add Recipe</Text>
          </TouchableOpacity>
          </View>
        )}
        </View>

        </SafeAreaView>
      )

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
 