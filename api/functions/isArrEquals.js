

module.exports = (arr , arr1) =>  

    JSON.stringify (  Array.from(new Set( arr.concat(arr1) ) ).sort((a ,b ) => (a < b)?-1:( a > b ? 1 : 0 ) )  ) 
        === 
    JSON.stringify(arr1.sort((a ,b ) => (a < b)?-1:( a > b ? 1 : 0 ) ) )   ;

 