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
import Buffer    from "./Buffer";
import SWFHeader from "./SWFHeader";
import SWFInfo   from "./SWFInfo";
import Rect      from "./records/Rect";
import Matrix    from "./records/Matrix";
import TagCode   from "./records/TagCode";
/*< import IExtReadable from "../interface/IExtReadable"; >*/
/*< import IExtWritable from "../interface/IExtWritable"; >*/
/*< import IRecordReadable from "../interface/IRecordReadable"; >*/
/*< import IRecordWritable from "../interface/IRecordWritable"; >*/

export default class SWFBuffer extends Buffer /*< implements IExtReadable, IExtWritable, IRecordReadable, IRecordWritable >*/ {
    constructor( ...args ) {
        super(...args);
    }
    
    getHeader( header ) {
        return this.getStruct(header || new SWFHeader());
    }
    
    setHeader( header ) {
        this.setStruct(header);
    }
    
    getSWFInfo( swfInfo ) {
        return this.getStruct(swfInfo || new SWFInfo());
    }
    
    setSWFInfo( swfInfo ) {
        this.setStruct(swfInfo);
    }
    
    trySWFInfo( swfInfo ) {
        if ( this.remain < 1 ) { return null; }
        
        var nbits = (this._buffer[this._offset] >> 3); // UB[5]
        var range = (2 + (((nbits << 2) - 3) >> 3));
        
        return (this.remain >= range + 4 ? this.getSWFInfo(swfInfo) : null);
    }
    
    getTagCode( tagCode ) {
        this.geton(2);
        
        var a = this._buffer[this._offset++];
        var b = this._buffer[this._offset++];
        
        var t = (b << 2) | (a >> 6); // High 10 bits
        var l = (a & 0x3F);          // Low 6 bits
        
        if ( l == 0x3F ) { l = this.getUI32(); }
        if ( !tagCode  ) { tagCode = new TagCode(); }
        
        tagCode.type   = t;
        tagCode.length = l;
        
        return tagCode;
    }
    
    setTagCode( tagCode ) {
        throw new SyntaxError("Method does not implements");
    }
    
    tryTagCode( tagCode ) {
        if ( this.remain < 2 ) { return null; }
        if ( this.remain < 6 && ((this._buffer[this._offset] & 0x3F) == 0x3F) ) { return null; }
        return this.getTagCode(tagCode);
    }
    
/*< DATA_TYPES >*/
    
    getFP16() {
        return this.getSI16() / 0x100;
    }
    
    setFP16( value ) {
        throw new SyntaxError("Method does not implements");
    }
    
    getFP32() {
        return this.getSI32() / 0x10000;
    }
    
    setFP32( value ) {
        throw new SyntaxError("Method does not implements");
    }
    
/*< BIT_VALUES >*/

    bitget( first, nbits ) {
        if ( nbits <= 0 ) { throw new RangeError(`The "nbits" must be a strictly positive integer`); }
        
        var bits = 0;
        var i = (this._offset + (first >> 3));
        var j = (first & 7);
        
        if ( j != 0 ) {
            var mbits = (8 - j); // mask
            
            bits = (this._buffer[i++] & ((1 << mbits) - 1));
            nbits -= mbits;
            
            if ( nbits <= 0 ) {
                return (bits >> (-nbits));
            }
        }
        
        for ( ; nbits >= 8; nbits -= 8 ) {
            bits = ((bits << 8) | (this._buffer[i++]));
        }
        
        if ( nbits > 0 ) {
            bits = (this._buffer[i] >> (8 - nbits)) | (bits << nbits);
        }
        
        return bits;
    }
    
    bitset( first, nbits, value ) {
        throw new SyntaxError("Method does not implements");
    }
    
/*< RECORDS >*/

    getRect( rect ) {
        this.geton(1);
        
        var nbits = (this._buffer[this._offset] >> 3); // UB[5]
        var range = (2 + (((nbits << 2) - 3) >> 3));
        
        this.geton(range);
        
        var a = this.bitget(5, nbits);                // SB[nbits]
        var b = this.bitget(5 + nbits, nbits);        // SB[nbits]
        var c = this.bitget(5 + 2 * nbits, nbits);    // SB[nbits]
        var d = this.bitget(5 + 3 * nbits, nbits);    // SB[nbits]
        
        var e = 32 - nbits;
        
        rect.x = (a << e >> e); // twips
        rect.y = (c << e >> e); // twips
        rect.width  = (b << e >> e) - rect.x; // twips
        rect.height = (d << e >> e) - rect.y; // twips
        
        this._offset += range;
        return rect;
    }
    
    setRect( rect ) {
        throw new SyntaxError("Method does not implements");
    }
}
