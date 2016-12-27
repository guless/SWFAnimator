/// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/// @Copyright ~2016 ☜Samlv9☞ and other contributors
/// @MIT-LICENSE | 1.0.0 | http://apidev.guless.com/
/// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
///                                              }|
///                                              }|
///                                              }|     　 へ　　　 ／|    
///      _______     _______         ______      }|      /　│　　 ／ ／
///     /  ___  |   |_   __ \      .' ____ '.    }|     │　Z ＿,＜　／　　 /`ヽ
///    |  (__ \_|     | |__) |     | (____) |    }|     │　　　　　ヽ　　 /　　〉
///     '.___`-.      |  __ /      '_.____. |    }|      Y　　　　　`　 /　　/
///    |`\____) |    _| |  \ \_    | \____| |    }|    ｲ●　､　●　　⊂⊃〈　　/
///    |_______.'   |____| |___|    \______,'    }|    ()　 v　　　　|　＼〈
///    |=========================================\|    　>ｰ ､_　 ィ　 │ ／／
///    |> LESS IS MORE                           ||     / へ　　 /　ﾉ＜|＼＼
///    `=========================================/|    ヽ_ﾉ　　(_／　 │／／
///                                              }|     7　　　　　　  |／
///                                              }|     ＞―r￣￣`ｰ―＿`
///                                              }|
///                                              }|
/// Permission is hereby granted, free of charge, to any person obtaining a copy
/// of this software and associated documentation files (the "Software"), to deal
/// in the Software without restriction, including without limitation the rights
/// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
/// copies of the Software, and to permit persons to whom the Software is
/// furnished to do so, subject to the following conditions:
///
/// The above copyright notice and this permission notice shall be included in all
/// copies or substantial portions of the Software.
///
/// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
/// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
/// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
/// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
/// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
/// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
/// THE SOFTWARE.

export default class UTF8Encoder {
    static encode( text ) {
        /// 计算保存该 UTF-8 字符串所需的字节长度。
        var count = 0;
        
        for ( var i = 0; i < text.length; ++i ) {
            var char = text.charCodeAt(i);
            
            /// UTF-16 代理对。
            if ( (char >= 0xD800) && (char <= 0xDBFF) && ((i + 1) < text.length) ) {
                var tail = text.charCodeAt(i + 1);
                
                /// 后尾代理。
                if ( (tail >= 0xDC00) && (tail <= 0xDFFF) ) {
                    ++i;
                    count += 4;
                    continue;
                }
            }
            
            count += (char <= 0x7F ? 1 : char <= 0x7FF ? 2 : 3);
        }
        
        var bytes = new Uint8Array(count);
        var index = 0;
        
        for ( var i = 0; i < text.length; ++i ) {
            var char = text.charCodeAt(i);
            
            /// UTF-16 代理对。
            if ( (char >= 0xD800) && (char <= 0xDBFF) && ((i + 1) < text.length) ) {
                var tail = text.charCodeAt(i + 1);
                
                /// 后尾代理。
                if ( (tail >= 0xDC00) && (tail <= 0xDFFF) ) {
                    ++i;
                    char = ((char & 0x3FF) << 10 | (tail & 0x3FF)) + 0x10000;
                }
            }
            
            /// 未匹配的代理对。
            if ( (char >= 0xD800) && (char <= 0xDFFF) ) {
                char = 0xFFFD;
            }
            
            if ( char <= 0x7F ) {
                bytes[index++] = char;
            }
            
            else if ( char <= 0x7FF ) {
                bytes[index++] = ((char >>>  6) + 0xC0);
                bytes[index++] = ((char & 0x3F) + 0x80);
            }
            
            else if ( char <= 0xFFFF ) {
                bytes[index++] = ((char  >>> 12) + 0xE0);
                bytes[index++] = (((char >>>  6) & 0x3F) + 0x80);
                bytes[index++] = ((char  & 0x3F) + 0x80);
            }
            
            else {
                bytes[index++] = ((char  >>> 18) + 0xF0);
                bytes[index++] = (((char >>> 12) & 0x3F) + 0x80);
                bytes[index++] = (((char >>>  6) & 0x3F) + 0x80);
                bytes[index++] = ((char  & 0x3F) + 0x80);
            }
        }
        
        return bytes;
    }
    
    static decode( bytes ) {
        var chars = "";
        
        for ( var i = 0; i < bytes.length; ++i ) {
            var byte = bytes[i];
            
            if ( byte >= 0x80 ) {
                /// 指示解码还需要多少个字节。
                var need = 0;
                
                /// 无效的 UTF-8 前缀字节。
                if ( (byte < 0xC2) || (byte > 0xF4) ) {
                    byte = 0xFFFD;
                }
                
                else {
                    switch( true ) {
                        /// [0x10000 ~ 0x10FFFF]
                        case ((byte & 0xF0) == 0xF0) :
                            if ( (i + 2) >= bytes.length ) {
                                byte = 0xFFFD;
                                need = 0;
                            }
                            
                            else {
                                var next = bytes[i + 1];
                                
                                if ( ((byte == 0xF0) && (next < 0x90)) || ((byte == 0xF4) && (next > 0x8F)) ) {
                                    byte = 0xFFFD;
                                    need = 0;
                                }
                                
                                else {
                                    byte = byte & 0x7;
                                    need = 3;
                                }
                            }
                            
                            break;
                        
                        /// [0x800 ~ 0xFFFF]
                        case ((byte & 0xE0) == 0xE0) :
                            if ( (i + 2) >= bytes.length ) {
                                byte = 0xFFFD;
                                need = 0;
                            }
                            
                            else {
                                var next = bytes[i + 1];
                                
                                if ( ((byte == 0xE0) && (next < 0xA0)) || ((byte == 0xED) && (next > 0x9F)) ) {
                                    byte = 0xFFFD;
                                    need = 0;
                                }
                                
                                else {
                                    byte = byte & 0xF;
                                    need = 2;
                                }
                            }
                            
                            break;
                        
                        /// [0x80 ~ 0x7FF]
                        case ((byte & 0xC0) == 0xC0) :
                            if ( (i + 1) >= bytes.length ) {
                                byte = 0xFFFD;
                                need = 0;
                            }
                            
                            else {
                                byte = byte & 0x1F;
                                need = 1;
                            }
                            
                            break;
                        
                        default: /* 未匹配的 UTF-8 字节。*/
                            byte = 0xFFFD;
                            break;
                    }
                }
                
                /// 处理 UTF-8 尾随字节。
                for ( var t = i, k = 1; k <= need; ++k ) {
                    var part = bytes[k + t];
                    
                    if ( (part >= 0x80) && (part <= 0xBF) ) {
                        ++i;
                        byte = ((byte << 6) | (part & 0x3F));
                    }
                    
                    /// 无效的 UTF-8 尾随字节。
                    else {
                        byte = 0xFFFD;
                        break;
                    }
                }
            }
            
            if ( byte >= 0x10000 ) {
                chars += String.fromCharCode((byte >> 10) + 0xD7C0, (byte & 0x3FF) + 0xDC00);
            }
            
            else if ( byte != 0xFEFF ) { /// Strip BOM。
                chars += String.fromCharCode(byte);
            }
        }
        
        return chars;
    }
}