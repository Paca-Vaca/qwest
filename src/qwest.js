/*
    qwest

    Version     : 0.2.4
    Author      : Aurélien Delogu (dev@dreamysource.fr)
    Homepage    : https://github.com/pyrsmk/qwest
    License     : MIT

    Doc
    ===
    https://github.com/ded/reqwest/blob/master/reqwest.js
    https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest

    TODO
    ====
    - timeout
    - type => response
        - types valides pour XHR2?
    - crossOrigin
    - widthCredentials
*/

this.qwest=function(){

    var qwest=function(method,url,data,options){

        // Format
        data=data || null;
        options=options || {};

        var win=window,
            typeSupported=false,
            // Get XMLHttpRequest object
            xhr=win.XMLHttpRequest?
                new XMLHttpRequest():
                new ActiveXObject('Microsoft.XMLHTTP'),
            version2=(xhr.responseType===''),
            async=options.async===undefined?true:!!options.async,
            cache=options.cache===undefined?true:!!options.cache,
            type=options.type?options.type.toLowerCase():'json',
            user=options.user || '',
            password=options.password || '',
            headers=options.headers || [],
            vars='',
            i,
            contentType='Content-Type',
            requestedWith='X-Requested-With',
            parseError='parseError',
            serialized,
            success_stack=[],
            error_stack=[],
            complete_stack=[],
            response,
            success,
            error,
            func,
            // Define promises
            promises={
                success:function(func){
                    if(async){
                        success_stack.push(func);
                    }
                    else if(success){
                        func.apply(xhr,[response]);
                    }
                    return promises;
                },
                error:function(func){
                    if(async){
                        error_stack.push(func);
                    }
                    else if(error){
                        func.apply(xhr,[response]);
                    }
                    return promises;
                },
                complete:function(func){
                    if(async){
                        complete_stack.push(func);
                    }
                    else{
                        func.apply(xhr);
                    }
                    return promises;
                }
            },
            // Handle the response
            handleResponse=function(){
                var i;
                try{
                    // Verify status code
                    if(xhr.status!=200){
                        throw xhr.status+" ("+xhr.statusText+")";
                    }
                    // Init
                    var responseText=xhr.responseText,
                        responseXML='responseXML';
                    // Process response
                    if(type=='text'){
                        response=responseText;
                    }
                    else if(typeSupported && xhr.response!==undefined){
                        response=xhr.response;
                    }
                    else{
                        switch(type){
                            case 'json':
                                try{
                                    if(win.JSON){
                                        response=win.JSON.parse(responseText);
                                    }
                                    else{
                                        response=eval('('+responseText+')');
                                    }
                                }
                                catch(e){
                                    throw "Error while parsing JSON body";
                                }
                                break;
                            case 'js':
                                response=eval(responseText);
                                break;
                            case 'xml':
                                if(!xhr[responseXML] || (xhr[responseXML][parseError] && xhr[responseXML][parseError].errorCode && xhr[responseXML][parseError].reason)){
                                    throw "Error while parsing XML body";
                                }
                                else{
                                    response=xhr[responseXML];
                                }
                                break;
                            default:
                                throw "Unsupported "+type+" type";
                        }
                    }
                    // Execute success stack
                    success=true;
                    if(async){
                        for(i=0;func=success_stack[i];++i){
                            func.apply(xhr,[response]);
                        }
                    }
                }
                catch(e){
                    error=true;
                    response="Request to '"+url+"' aborted: "+e;
                    // Execute error stack
                    if(async){
                        for(i=0;func=error_stack[i];++i){
                            func.apply(xhr,[response]);
                        }
                    }
                }
                // Execute complete stack
                if(async){
                    for(i=0;func=complete_stack[i];++i){
                        func.apply(xhr);
                    }
                }
            };

        // Identify supported XHR version
        if(type && version2){
            xhr.responseType=type;
            typeSupported=(xhr.responseType==type);
        }
        // Prepare data
        if(data instanceof ArrayBuffer || data instanceof Blob || data instanceof Document || data instanceof FormData){
            if(method=='GET'){
                data=null;
            }
        }
        else{
            var values=[],
                enc=encodeURIComponent;
            for(i in data){
                values.push(enc(i)+'='+enc(data[i]));
            }
            data=values.join('&');
            serialized=true;
        }
        // Prepare URL
        if(method=='GET'){
            vars+=data;
        }
        if(cache){
            if(vars){
                vars+='&';
            }
            vars+='t='+Date.now();
        }
        if(vars){
            url+=(/\?/.test(url)?'&':'?')+vars;
        }
        // Open connection
        xhr.open(method,url,async,user,password);
        // Plug response handler
        if(version2){
            xhr.onload=handleResponse;
        }
        else{
            xhr.onreadystatechange=function(){
                if(xhr.readyState==4){
                    handleResponse();
                }
            };
        }
        // Prepare headers
        if(serialized && method=='POST' && !headers[contentType]){
            headers[contentType]='application/x-www-form-urlencoded';
        }
        if(!headers[requestedWith]){
            headers[requestedWith]='XMLHttpRequest';
        }
        for(i in headers){
            xhr.setRequestHeader(i,headers[i]);
        }
        // Send request
        xhr.send(method=='POST'?data:null);
        // Return promises
        return promises;
    };

    // Return final qwest object
    return {
        get:function(url,data,options){
            return qwest('GET',url,data,options);
        },
        post:function(url,data,options){
            return qwest('POST',url,data,options);
        }
    };
    
}();