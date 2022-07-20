/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, { useState } from 'react';
 import DeviceInfo from 'react-native-device-info';
 import {
   StyleSheet,
   Text,
   View,
   Image,
   SafeAreaView,
   Dimensions, 
   Platform, 
   PixelRatio,
   Button,
   Alert,
   TouchableOpacity,
   StatusBar,
   Animated,
   ScrollView,
   ActivityIndicator,
   FlatList
 } from 'react-native';

 import firestore, { firebase } from '@react-native-firebase/firestore';

 import FastImage from 'react-native-fast-image'
import { normalize } from '../screens/MainScreen';
import colors from '../colors';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;
const screenHeight = Dimensions.get('screen').height;

const scale = windowWidth / 350;

export default class RecipeItem extends React.Component { 
  constructor(props) {
    super(props);

    this.state={
        view:0,
    }

  }

  async recipeClicked(recipe, opinion){
    this.setState({loading:true})
    var date = new Date();
    var dateStr =
      ("00" + (date.getMonth() + 1)).slice(-2) + "/" +
      ("00" + date.getDate()).slice(-2) + "/" +
      date.getFullYear() + " " +
      ("00" + date.getHours()).slice(-2) + ":" +
      ("00" + date.getMinutes()).slice(-2) + ":" +
      ("00" + date.getSeconds()).slice(-2);

    if (opinion == 'like'){
        if (!recipe.likes.includes(this.props.userId)){
            await firebase.firestore().collection('Recipes').doc(recipe.id).update({
                likes:recipe.likes.concat([this.props.userId]),
                dislikes:recipe.dislikes.filter(u=>u!=this.props.userId),
                neutrals:recipe.neutrals.filter(u=>u!=this.props.userId)
                });
        }

    }else if (opinion == 'dislike'){
        if (!recipe.dislikes.includes(this.props.userId)){
            await firebase.firestore().collection('Recipes').doc(recipe.id).update({
                dislikes:recipe.dislikes.concat([this.props.userId]),
                likes:recipe.likes.filter(u=>u!=this.props.userId),
                neutrals:recipe.neutrals.filter(u=>u!=this.props.userId)
        
              });
        }

    }else if (opinion == 'neutral'){
        if (!recipe.neutrals.includes(this.props.userId)){
            await firebase.firestore().collection('Recipes').doc(recipe.id).update({
                neutrals:recipe.neutrals.concat([this.props.userId]),
                likes:recipe.likes.filter(u=>u!=this.props.userId),
                dislikes:recipe.dislikes.filter(u=>u!=this.props.userId)
    
            });
        }

        }
    this.setState({loading:false})
  }

  async removeRecipe(recipe){
    const newLikes = recipe.likes.filter(u=>u!=this.props.userId);
    const newDislikes = recipe.dislikes.filter(u=>u!=this.props.userId);
    const newNeutrals = recipe.neutrals.filter(u=>u!=this.props.userId);

    await firebase.firestore().collection('Recipes').doc(recipe.id).update({
        likes:newLikes,
        dislikes:newDislikes,
        neutrals:newNeutrals,
    })

  }

  render() { 
    if (this.state.view==0){
        return (
        <TouchableOpacity onLongPress={()=>this.removeRecipe(this.props.recipe)} onPress={()=>this.setState({view:1})} style={{width:windowWidth,height:windowHeight - normalize(45) - windowHeight/14, backgroundColor:'transparent', padding:normalize(10), borderRadius:normalize(8)}}>
        <View style={{position:'absolute', zIndex:1, width:'100%',alignSelf:'center',paddingBottom:normalize(10),borderTopRightRadius:normalize(8),borderTopLeftRadius:normalize(8), marginTop:normalize(10), backgroundColor:(this.props.recipe.poster==this.props.userId)?colors.BLUE:colors.RED}}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={{alignSelf:'center', fontSize:normalize(30), fontWeight:'bold', marginTop:normalize(8), color:colors.WHITE}}>{this.props.recipe.recipeName}</Text>
        </View>

        <FastImage source={{uri:this.props.recipe.recipeImage}} style={{width:'100%',height:windowHeight - normalize(45) - windowHeight/14 - normalize(4) - windowHeight/8, borderRadius:normalize(8)}}/>
        <View style={{height:normalize(55)+windowWidth*0.02, marginTop:windowWidth*0.02,width:windowWidth, flexDirection:'row', justifyContent:'center'}}>
                <TouchableOpacity onPress={()=>this.recipeClicked(this.props.recipe, 'dislike')} style={{width:windowWidth/8, height:windowWidth/8, alignSelf:'center',marginRight:windowWidth/12}}>
                <Image style={{tintColor:(this.props.recipe.dislikes.includes(this.props.userId))?colors.RED:colors.GRAY,width:windowWidth/8, height:windowWidth/8, alignSelf:'center',marginRight:windowWidth/12, transform: [{ rotate: '180deg'}]}} source={require('../../.assets/dislike.png')}></Image>
                </TouchableOpacity>

                <TouchableOpacity onPress={()=>this.recipeClicked(this.props.recipe, 'neutral')} style={{width:windowWidth/8, height:windowWidth/8, alignSelf:'center'}}>
                <Image style={{tintColor:(this.props.recipe.neutrals.includes(this.props.userId))?colors.BLUE:colors.GRAY,width:windowWidth/8, height:windowWidth/8, alignSelf:'center'}} source={require('../../.assets/minus.png')}></Image>
                </TouchableOpacity>

                <TouchableOpacity onPress={()=>this.recipeClicked(this.props.recipe, 'like')} style={{width:windowWidth/8, height:windowWidth/8, alignSelf:'center',marginLeft:windowWidth/12}}>
                <Image style={{tintColor:(this.props.recipe.likes.includes(this.props.userId))?colors.GREEN:colors.GRAY,width:windowWidth/8, height:windowWidth/8, alignSelf:'center',marginLeft:windowWidth/12}} source={require('../../.assets/like.png')}></Image>
                </TouchableOpacity>
        </View>
        </TouchableOpacity>
    )
    }else{
        const ingredientsList = this.props.recipe.recipeIngredients.map((data, key) => {
            return (                            
            <View key={key} style={{justifyContent:'center', width:windowWidth, height:windowHeight/20}}>
            <Text style={{alignSelf:'center', color:colors.WHITE, fontSize:normalize(20)}}>{data}</Text>
            </View>
            )
          })

          const instructionsList = this.props.recipe.recipeInstructions.map((data, key) => {
            return (                            
            <View key={key} style={{justifyContent:'center', width:windowWidth, height:windowHeight/20}}>
            <Text style={{alignSelf:'center', color:colors.WHITE, fontSize:normalize(20)}}>{data}</Text>
            </View>
            )
          })
        return (
            <TouchableOpacity onLongPress={()=>this.removeRecipe(this.props.recipe)} onPress={()=>this.setState({view:0})} style={{width:windowWidth,height:windowHeight - normalize(45) - windowHeight/14, backgroundColor:'transparent', padding:normalize(10), borderRadius:normalize(8)}}>
                <View style={{width:'100%',height:windowHeight - normalize(45) - windowHeight/14 - normalize(4) - windowHeight/8, borderRadius:normalize(8), backgroundColor:(this.props.recipe.poster==this.props.userId)?colors.BLUE:colors.RED}}>
                    <Text adjustsFontSizeToFit numberOfLines={1} style={{alignSelf:'center', fontSize:normalize(30), fontWeight:'bold', marginTop:normalize(8), color:colors.WHITE}}>{this.props.recipe.recipeName}</Text>

                    <Text adjustsFontSizeToFit numberOfLines={1} style={{alignSelf:'center', fontSize:normalize(22), fontWeight:'bold',marginTop:normalize(8), color:colors.WHITE}}>Ingredients</Text>
                    {ingredientsList}
                    <Text adjustsFontSizeToFit numberOfLines={1} style={{alignSelf:'center', fontSize:normalize(22), fontWeight:'bold',marginTop:normalize(8), color:colors.WHITE}}>Instructions</Text>
                    {instructionsList}

                </View>
            <View style={{height:normalize(55)+windowWidth*0.02, marginTop:windowWidth*0.02,width:windowWidth, flexDirection:'row', justifyContent:'center'}}>
              <TouchableOpacity onPress={()=>this.recipeClicked(this.props.recipe, 'dislike')} style={{width:windowWidth/8, height:windowWidth/8, alignSelf:'center',marginRight:windowWidth/12}}>
                <Image style={{tintColor:(this.props.recipe.dislikes.includes(this.props.userId))?colors.RED:colors.GRAY,width:windowWidth/8, height:windowWidth/8, alignSelf:'center',marginRight:windowWidth/12, transform: [{ rotate: '180deg'}]}} source={require('../../.assets/dislike.png')}></Image>
                </TouchableOpacity>

                <TouchableOpacity onPress={()=>this.recipeClicked(this.props.recipe, 'neutral')} style={{width:windowWidth/8, height:windowWidth/8, alignSelf:'center'}}>
                <Image style={{tintColor:(this.props.recipe.neutrals.includes(this.props.userId))?colors.BLUE:colors.GRAY,width:windowWidth/8, height:windowWidth/8, alignSelf:'center'}} source={require('../../.assets/minus.png')}></Image>
                </TouchableOpacity>

                <TouchableOpacity onPress={()=>this.recipeClicked(this.props.recipe, 'like')} style={{width:windowWidth/8, height:windowWidth/8, alignSelf:'center',marginLeft:windowWidth/12}}>
                <Image style={{tintColor:(this.props.recipe.likes.includes(this.props.userId))?colors.GREEN:colors.GRAY,width:windowWidth/8, height:windowWidth/8, alignSelf:'center',marginLeft:windowWidth/12}} source={require('../../.assets/like.png')}></Image>
                </TouchableOpacity>
            </View>

            </TouchableOpacity>
        )
    }
}
}

const styles = StyleSheet.create({
});

 