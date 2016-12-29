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
/*< import IReadable from "../interface/IReadable"; >*/
/*< import IWritable from "../interface/IWritable"; >*/
/*< import ITextReadable from "../interface/ITextReadable"; >*/
/*< import ITextWritable from "../interface/ITextWritable"; >*/
/*< import IStructReadable from "../interface/IStructReadable"; >*/
/*< import IStructWritable from "../interface/IStructWritable"; >*/
import IEEE754 from "./helpers/IEEE754";
import UTF8Encoder from "./helpers/UTF8Encoder";
import UCS2Encoder from "./helpers/UCS2Encoder";

export default class Buffer /*< implements IReadable, IWritable, ITextReadable, ITextWritable, IStructReadable, IStructWritable >*/ {
    static __CHUNK_SIZE__         = 2 * 1024; // 2KB
    static __USE_TEXT_ENCODER__   = true;
    static __HAS_TEXT_ENCODER__   = ((typeof TextEncoder == "function") && (typeof TextDecoder == "function"));
    static __HAS_COPY_WITHIN__    = (typeof Uint8Array.prototype.copyWithin == "function");
    static __HAS_STATIC_ISARRAY__ = (typeof Array.isArray == "function");
    static __HAS_UTF16_DECODER__  = (Buffer.__HAS_TEXT_ENCODER__ && (new TextDecoder("utf-16le").encoding == "utf-16le"));
    static __HAS_UTF16_ENCODER__  = (Buffer.__HAS_TEXT_ENCODER__ && (new TextEncoder("utf-16le").encoding == "utf-16le"));
    
    static __UTF8_TEXT_ENCODER__ = null;
    static __UTF8_TEXT_DECODER__ = null;
    static __UCS2_TEXT_ENCODER__ = null;
    static __UCS2_TEXT_DECODER__ = null;
    
    constructor( ...args ) {
        if ( (args.length == 0) || (args[0] == undefined) ) {
            this._buffer = new Uint8Array(0);
        }
        
        else if ( typeof args[0] == "number" ) {
            this._buffer = new Uint8Array(args[0]);
        }
        
        else if ( (Buffer.__HAS_STATIC_ISARRAY__ ? Array.isArray(args[0]) : (args[0] instanceof Array)) ) {
            this._buffer = new Uint8Array(args[0]);
        }
        
        else if ( args[0] instanceof ArrayBuffer ) {
            this._buffer = new Uint8Array(args[0], args[1], args[2]);
        }
        
        else if ( args[0] instanceof Uint8Array 
               || args[0] instanceof Uint8ClampedArray
               || args[0] instanceof Uint16Array
               || args[0] instanceof Uint32Array
               || args[0] instanceof Int8Array
               || args[0] instanceof Int16Array
               || args[0] instanceof Int32Array 
               || args[0] instanceof Float32Array
               || args[0] instanceof Float64Array
               || args[0] instanceof DataView ) {
                   
            this._buffer = new Uint8Array(args[0].buffer, args[0].byteOffset, args[0].byteLength);
        }
        
        else {
            throw new TypeError("Require buffer or typed array");
        }
        
        this._offset = 0;
        this._length = this._buffer.length;
    }
    
    get offset() {
        return this._offset;
    }
    
    set offset( value ) {
        if ( value < 0 ) {
            value += this._length;
        }
        
        if ( value < 0 ) {
            throw new RangeError("Offset is outside the bounds of the buffer");
        }
        
        this._offset = value;
    }
    
    get remain() {
        return Math.max(0, this._length - this._offset);
    }
    
    get length() {
        return this._length;
    }
    
    set length( value ) {
        if ( value < 0 ) {
            throw new RangeError("Invalid buffer length");
        }
        
        this.alloc(this._length, this._length = value);
    }
    
    get content() {
        return this._buffer.subarray(0, this._length);
    }
    
    seton( size ) {
        /* 该方法可由子类覆盖实现，或者外部覆盖实现！*/
        /* 当缓冲区发生数据写入之前将调用该方法。默认情况，当缓冲区数据不足时将调用 "Buffer.alloc()" 方法分配足够的空间。*/
        if ( size > this.remain ) {
            this.alloc(this._offset, this._length = size + this._offset);
        }
    }
    
    geton( size ) {
        /* 该方法可由子类覆盖实现，或者外部覆盖实现！*/
        /* 当缓冲区数据发生读取前将调用该方法。默认情况，当缓冲区数据不足时将抛出 "RangeError" 类型错误。*/
        if ( size > this.remain ) {
            throw new RangeError("Offset is outside the bounds of the buffer");
        }
    }
    
    alloc( offset, length, match = false ) {
        if ( this._buffer.length >= length ) {
            return;
        }
        
        var newlen = match ? length : (Buffer.__CHUNK_SIZE__ * Math.ceil(length / Buffer.__CHUNK_SIZE__));
        var oldbuf = this._buffer.subarray(0, Math.min(offset, this._length));
        
        this._buffer = new Uint8Array(newlen);
        this._buffer.set(oldbuf, 0);
    }
    
    write( ...chunks ) {
        if ( chunks.length == 1 ) {
            var chunk = chunks[0];
            
            if ( chunk instanceof ArrayBuffer ) {
                chunk = new Uint8Array(chunk);
            }
            
            else if ( chunk instanceof Uint8Array 
                   || chunk instanceof Uint8ClampedArray
                   || chunk instanceof Uint16Array
                   || chunk instanceof Uint32Array
                   || chunk instanceof Int8Array
                   || chunk instanceof Int16Array
                   || chunk instanceof Int32Array 
                   || chunk instanceof Float32Array
                   || chunk instanceof Float64Array
                   || chunk instanceof DataView ) {
                    
                chunk = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);       
            }
            
            else {
                throw new TypeError("Require buffer or typed array");
            }
            
            if ( chunk.length == 0 ) {
                return;
            }
            
            this.alloc(this._length, this._length += chunk.length);
            this._buffer.set(chunk, this._length - chunk.length);
        }
        
        else {
            var size = 0;
            var list = [];
            
            for ( var i = 0; i < chunks.length; ++i ) {
                var chunk = chunks[i];
                
                if ( chunk instanceof ArrayBuffer ) {
                    chunk = new Uint8Array(chunk);
                }
                
                else if ( chunk instanceof Uint8Array 
                    || chunk instanceof Uint8ClampedArray
                    || chunk instanceof Uint16Array
                    || chunk instanceof Uint32Array
                    || chunk instanceof Int8Array
                    || chunk instanceof Int16Array
                    || chunk instanceof Int32Array 
                    || chunk instanceof Float32Array
                    || chunk instanceof Float64Array
                    || chunk instanceof DataView ) {
                        
                    chunk = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);       
                }
                
                else {
                    throw new TypeError("Require buffer or typed array");
                }
                
                if ( chunk.length > 0 ) {
                    size += chunk.length;
                    list.push(chunk);
                }
            }
            
            if ( size <= 0 ) {
                return;
            }
            
            this.alloc(this._length, this._length += size);
            
            for ( var i = 0, j = this._length - size; i < list.length; ++i ) {
                var chunk = list[i];
                
                this._buffer.set(chunk, (j += chunk.length) - chunk.length);
            }
        }
    }
    
    flush( ...args ) {
        var size = 0;
        
        if ( args.length == 0 ) {
            size = this._offset;
        }
        
        else {
            size = +(args[0]);
        }
        
        if ( size <= 0 ) {
            return;
        }
        
        if ( size < this._length ) {
            if ( Buffer.__HAS_COPY_WITHIN__ ) {
                this._buffer.copyWithin(0, size, this._length);
            }
            
            else {
                this._buffer.set(this._buffer.subarray(size, this._length), 0);
            }
        }
        
        this._offset = Math.max(0, this._offset - size);
        this._length = Math.max(0, this._length - size);
    }
    
    hexof( offset = 0, length = 16 ) {
        if ( offset < 0 ) {
            offset += this._length;
        }
        
        if ( offset < 0 ) {
            throw new RangeError("Offset is outside the bounds of the buffer");
        }
        
        if ( length < 0 ) {
            throw new RangeError("Invalid buffer length");
        }
        
        var codes = [];
        var total = Math.max(0, Math.min(length, this._length - offset));
        
        for ( var i = 0; i < total; ++i ) {
            codes.push(("0" + this._buffer[i + offset].toString(16)).slice(-2));
        }
        
        if ( codes.length <= 0 ) {
            codes.push("empty");
        }
        
        else if ( this._length > total + offset ) {
            codes.push("...");
        }
        
        return `[Buffer offset=${this._offset}, length=${this._length}, content=<${codes.toString()}>]`;
    }
    
    getBool() {
        this.geton(1);
        return !!(this._buffer[this._offset++]);
    }
    
    setBool( value ) {
        this.seton(1);
        this._buffer[this._offset++] = !!value;
    }
    
    getUI8() {
        this.geton(1);
        return this._buffer[this._offset++];
    }
    
    setUI8( value ) {
        this.seton(1);
        this._buffer[this._offset++] = value;
    }
    
    getSI8() {
        this.geton(1);
        return ((this._buffer[this._offset++] << 24) >> 24);
    }
    
    setSI8( value ) {
        this.seton(1);
        this._buffer[this._offset++] = value;
    }
    
    getUI16() {
        this.geton(2);
        
        var a = this._buffer[this._offset++];
        var b = this._buffer[this._offset++];
        
        return ((b << 8) | a);
    }
    
    setUI16( value ) {
        this.seton(2);
        
        this._buffer[this._offset++] = value;
        this._buffer[this._offset++] = value >> 8;
    }
    
    getSI16() {
        this.geton(2);
        
        var a = this._buffer[this._offset++];
        var b = this._buffer[this._offset++];
        
        return ((((b << 8) | a) << 16) >> 16);
    }
    
    setSI16( value ) {
        this.seton(2);
        
        this._buffer[this._offset++] = value;
        this._buffer[this._offset++] = value >> 8;
    }
    
    getUI32() {
        this.geton(4);
        
        var a = this._buffer[this._offset++];
        var b = this._buffer[this._offset++];
        var c = this._buffer[this._offset++];
        var d = this._buffer[this._offset++];
        
        return (((d << 24) | (c << 16) | (b << 8) | a) >>> 0);
    }
    
    setUI32( value ) {
        this.seton(4);
        
        this._buffer[this._offset++] = value;
        this._buffer[this._offset++] = value >> 8;
        this._buffer[this._offset++] = value >> 16;
        this._buffer[this._offset++] = value >> 24;
    }
    
    getSI32() {
        this.geton(4);
        
        var a = this._buffer[this._offset++];
        var b = this._buffer[this._offset++];
        var c = this._buffer[this._offset++];
        var d = this._buffer[this._offset++];
        
        return ((d << 24) | (c << 16) | (b << 8) | a);
    }
    
    setSI32( value ) {
        this.seton(4);
        
        this._buffer[this._offset++] = value;
        this._buffer[this._offset++] = value >> 8;
        this._buffer[this._offset++] = value >> 16;
        this._buffer[this._offset++] = value >> 24;
    }
    
    getFL32() {
        this.geton(4);
        return IEEE754.read(this._buffer, (this._offset += 4) - 4, true, 23, 4);
    }
    
    setFL32( value ) {
        this.seton(4);
        IEEE754.write(this._buffer, value, (this._offset += 4) - 4, true, 23, 4);
    }
    
    getFL64() {
        this.geton(8);
        return IEEE754.read(this._buffer, (this._offset += 8) - 8, true, 52, 8);
    }
    
    setFL64( value ) {
        this.seton(8);
        IEEE754.write(this._buffer, value, (this._offset += 8) - 8, true, 52, 8);
    }
    
    getBytes( length ) {
        if ( length < 0 ) {
            throw new RangeError("Invalid buffer length.");
        }
        
        this.geton(length);
        return this._buffer.subarray(this._offset, this._offset += length);
    }
    
    setBytes( bytes ) {
        this.seton(bytes.length);
        this._buffer.set(bytes, (this._offset += bytes.length) - bytes.length);
    }
    
    getUTF8( length ) {
        /// 支持 TextEncoder API。
        if ( Buffer.__USE_TEXT_ENCODER__ && Buffer.__HAS_TEXT_ENCODER__ ) {
            
            if ( !Buffer.__UTF8_TEXT_DECODER__ ) { 
                Buffer.__UTF8_TEXT_DECODER__ = new TextDecoder("utf-8"); 
            }
            
            return Buffer.__UTF8_TEXT_DECODER__.decode(this.getBytes(length));
        }
        
        else {
            return UTF8Encoder.decode(this.getBytes(length));
        }
    }
    
    setUTF8( text ) {
        /// 支持 TextEncoder API。
        if ( Buffer.__USE_TEXT_ENCODER__ && Buffer.__HAS_TEXT_ENCODER__ ) {
            
            if ( !Buffer.__UTF8_TEXT_ENCODER__ ) { 
                Buffer.__UTF8_TEXT_ENCODER__ = new TextEncoder("utf-8"); 
            }
            
            this.setBytes(Buffer.__UTF8_TEXT_ENCODER__.encode(text));
        }
        
        else {
            this.setBytes(UTF8Encoder.encode(text));
        }
    }
    
    getUCS2( length ) {
        /// 支持 TextEncoder API。
        if ( Buffer.__HAS_TEXT_ENCODER__ && Buffer.__HAS_UTF16_DECODER__ ) {
            if ( !Buffer.__UCS2_TEXT_DECODER__ ) {
                Buffer.__UCS2_TEXT_DECODER__ = new TextDecoder("utf-16le");
            }
            
            return Buffer.__UCS2_TEXT_DECODER__.decode(this.getBytes(length));
        }
        
        else {
            return UCS2Encoder.decode(this.getBytes(length));
        }
    }
    
    setUCS2( text ) {
        /// TextEncoder API 不在支持 "utf-16be"/"utf-16le" 编码。
        /// https://github.com/whatwg/encoding/issues/18
        /// https://github.com/whatwg/encoding/commit/f8cad6e422f3d813481d2991deacf92d9a796cb7
        if ( Buffer.__HAS_TEXT_ENCODER__ && Buffer.__HAS_UTF16_ENCODER__ ) {
            if ( !Buffer.__UCS2_TEXT_ENCODER__ ) {
                Buffer.__UCS2_TEXT_ENCODER__ = new TextEncoder("utf-16le");
            }
            
            this.setBytes(Buffer.__UCS2_TEXT_ENCODER__.encode(text));
        } 
        
        else {
            this.setBytes(UCS2Encoder.encode(text));
        }
    }
    
    getStruct( obj ) {
        obj.decode(this);
        return obj;
    }
    
    setStruct( obj ) {
        obj.encode(this);
    }
    
    toString() {
        return this.hexof(0);
    }
}