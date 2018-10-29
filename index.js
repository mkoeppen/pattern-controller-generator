'use strict';

var through = require('through2');

function patternControllerGenerator(options) {

    options = options || {}; 

    function stringUpperFirstChar(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
  
    function stringToCamelCase(string, separator) {
      var separator = separator || "-";
  
      var upperCamelCase = stringToUpperCamelCase(string, separator);
  
      return stringUpperFirstChar(upperCamelCase);
    }
  
    function stringToUpperCamelCase(string, separator) {
      var separator = separator || "-";
      return string.split(separator).map(function(substring){ 
        return stringUpperFirstChar(substring); 
      }).join("");
    }
  
    // done
    function parseEnumSettings(twigContent) {
  
  
      var findCommentRegex = /\{\#\#[\s\S]*?\#\}/m,
      findEnumLines = /@enum.*/g,
      settingsFullString = twigContent.match(findCommentRegex),
      enumLineStrings = [],
      enumSettings = [];
  
      if(!settingsFullString || settingsFullString.length <= 0) return;
  
      enumLineStrings = settingsFullString[0].match(findEnumLines);
  
      enumLineStrings.forEach(function(item){
        var enumItems = item.split(" ").filter(function (el) { return el; });
  
        enumSettings.push({
          name: enumItems.length >= 2 ? stringToUpperCamelCase(enumItems[1]) : "",
          items: enumItems.length >= 2 ? enumItems.slice(2).map(function(enumItem) { 
            return {
              name: stringToUpperCamelCase(enumItem),
              value: enumItem
            } 
          }) : []
        });
      });
  
      return enumSettings;
    }
  
    // done
    function parseVariableSettings(twigContent) {
      var findCommentRegex = /\{\#\#[\s\S]*?\#\}/m,
      findVarLines = /@var.*/g,
      settingsFullString = twigContent.match(findCommentRegex),
      variableLineStrings,
      variableSettings = [];
  
      if(!settingsFullString || settingsFullString.length <= 0) return;
  
      variableLineStrings = settingsFullString[0].match(findVarLines) || [];
  
      variableLineStrings.forEach(function(item){
        var variable = item.split(" ").filter(function (el) { return el; });
  
        variableSettings.push({
          fullname: variable.length >= 2 ? variable[1] : "",
          name: variable.length >= 2 ? variable[1].replace(/.*?__/, "") : "",
          type: variable.length >= 3 ? variable[2] : "",
          comment: variable.length >= 4 ? variable.slice(4).join(" ") : ""
        });
      });
  
      return variableSettings;
    }
  
    function asPhpType(type) {
      switch (type) {
        case "KeyValueMap":
          return "array|null";
        default:
          return type + "|null";
      }
    }
  
    // done
    function parseConstructorSettings(twigContent) {
      var findCommentRegex = /\{\#\#[\s\S]*?\#\}/m,
      findVarLines = /@param.*/g,
      settingsFullString = twigContent.match(findCommentRegex),
      variableLineStrings = [],
      variableSettings = [];
  
      if(!settingsFullString || settingsFullString.length <= 0) return;
      
      variableLineStrings = settingsFullString[0].match(findVarLines);
  
      variableLineStrings.forEach(function(item){
        var variable = item.split(" ").filter(function (el) { return el; });
  
        variableSettings.push({
          fullname: variable.length >= 2 ? variable[1] : "",
          name: variable.length >= 2 ? variable[1].replace(/.*?__/, "") : "",
          type: variable.length >= 3 ? variable[2] : "",
          phpType: variable.length >= 3 ? variable[2] : "",
          comment: variable.length >= 4 ? variable.slice(4).join(" ") : ""
        });
      });
  
      return variableSettings;
    }
  
    function generatePhp(patternName, patternType, variables, constructorParameter, enumSettings) {
      var phpContent = "<?php\n\n\t/* TWIG-File-Basename: " + patternName + " */\n\n\t[__NAMESPACE__]\n\n[__ENUMS__]\n\n[__CLASS__]\n?>",
      classContent = "\tclass [__CLASSNAME__] extends BasePattern {\n[__DECLARATIONS__]\n\n[__CONSTRUCTOR__]\n\n[__FUNCTIONS__]\n\n[__GET_JSON__]\n\t}\n",
      declarations = "",
      functions = "",
      declarationTemplate = "\n\t\t/\*\*\n[__VAR_COMMENT__]\t\t\* \@var [__VAR_TYPE__]\n\t\t\*\/\n\t\tprivate $[__VAR_NAME__] = [__DEFAULT_VALUE__];\n",
      getterTemplate = "\n\t\t/\*\*\n\t\t\* \@return [__RETURN_TYPE__]\n\t\t\*\/\n\t\tpublic function get[__VAR_NAME_TITLE__]() {\n\t\t\treturn $this->[__VAR_NAME__];\n\t\t}\n",
      setterTemplate = "\n\t\t/\*\*\n\t\t* @param [__VAR_TYPE__] $[__VAR_NAME__]\n\t\t\* \@return [__RETURN_TYPE__]\n\t\t\*\/\n\t\tpublic function set[__VAR_NAME_TITLE__]($[__VAR_NAME__]) {\n\t\t\t$this->[__VAR_NAME__] = $[__VAR_NAME__];\n\t\t}\n",
      asJson = "",
      asJsonTemplate = "\n\t\tpublic function asJson():array\n\t\t{\n\t\t\treturn [\n[__ASSIGNMENTS__]\t\t\t];\n\t\t}\n",
      asJsonAssignmentTemplate = "\t\t\t\t'" + patternName + "__[__VAR_NAME__]' => $this->[__VAR_NAME__],\n",
      constructorTemplate = "\n\t\t/\*\*\n[__PARAMETER_DOCUMENTATION__]\t\t\* \@return void\n\t\t\*\/\n\t\tpublic function __construct([__PARAMETERS__]) {\n[__ASSIGNMENTS__]\t\t}",
      constructor = "",
      enums = "",
      enumTemplate ="\n\tabstract class [__ENUM_NAME__] extends BaseEnum {\n[__ENUM_ITEMS__]\t}\n",
      enumItemTemplate = "\t\tconst [__ENUM_ITEM__] = \"[__ENUM_VALUE__]\";\n";
  
      function generateEnums(enums) {
        
        return enums.map(function(enumObject) {
  
          var enumItems = enumObject.items.map(function(enumItem) {
            return enumItemTemplate
            .replace(/\[__ENUM_ITEM__\]/g, enumItem.name)
            .replace(/\[__ENUM_VALUE__\]/g, enumItem.value);
          }).join("");
  
          return enumTemplate
          .replace(/\[__ENUM_NAME__\]/g, enumObject.name)
          .replace(/\[__ENUM_ITEMS__\]/g, enumItems);
        }).join("");
      }
  
      function generateVariableDeclarationsPhp(variables, declarationTemplate) {
        return variables.map(function(variable) {
          var name = variable.name;
          
          if(!name) return "";
  
          var comment = variable.comment ? "\t\t\* [__COMMENT__]\n\t\t\*\n".replace(/\[__COMMENT__\]/g, stringUpperFirstChar(variable.comment)) : "";
  
          return declarationTemplate.replace(/\[__VAR_NAME__\]/g, name).replace(/\[__VAR_TYPE__\]/g, asPhpType(variable.type)).replace(/\[__DEFAULT_VALUE__\]/g, "null").replace(/\[__VAR_COMMENT__\]/g, comment);
        }).join("")
      }
  
      function generateFunctionDeclarationsPhp(variables, getterTemplate, setterTemplate) {
        return variables.map(function(variable) {
          var name = variable.name;
    
          if(!name) return "";
          return getterTemplate
          .replace(/\[__RETURN_TYPE__\]/g, asPhpType(variable.type))
          .replace(/\[__VAR_NAME__\]/g, name)
          .replace(/\[__VAR_NAME_TITLE__\]/g, stringToUpperCamelCase(name, "_")) +
          setterTemplate
          .replace(/\[__VAR_TYPE__\]/g, asPhpType(variable.type))
          .replace(/\[__RETURN_TYPE__\]/g, "void")
          .replace(/\[__VAR_NAME__\]/g, name)
          .replace(/\[__VAR_NAME_TITLE__\]/g, stringToUpperCamelCase(name, "_"));
        }).join("");
      }
  
      function generateGetJsonPhp(variables, asJsonTemplate, asJsonAssignmentTemplate) {
        return asJsonTemplate.replace(/\[__ASSIGNMENTS__\]/g, variables.map(function(variable) {
          var name = variable.name;
          if(!name) return "";
          return asJsonAssignmentTemplate.replace(/\[__VAR_NAME__\]/g, name);
        }).join(""));
      }
  
      function generateConstructor(variables, constructorParameter) {
        var parameterSettings = constructorParameter.map(function(parameter) { 
          var settings = variables.filter(function(v) { 
            return v.name === parameter.name
          })
          return settings.length > 0 ? settings[0] : {};
        });
  
        var parameters = parameterSettings.map(function(variable) {
          return variable.name ? "$" + variable.name : "";
        }).join(", ");
  
        var assignments = parameterSettings.map(function(variable) {
          return "\t\t\t$this->[__VAR_NAME__] = $[__VAR_NAME__];\n".replace(/\[__VAR_NAME__\]/g, variable.name);
        }).join("");
  
        var parameterDocumentation = parameterSettings.map(function(variable) {
          return "\t\t* @param [__VAR_TYPE__] $[__VAR_NAME__]\n".replace(/\[__VAR_NAME__\]/g, variable.name).replace(/\[__VAR_TYPE__\]/g, asPhpType(variable.type))
        }).join("");
  
        return constructorTemplate.replace(/\[__PARAMETER_DOCUMENTATION__\]/, parameterDocumentation).replace(/\[__PARAMETERS__\]/g, parameters).replace(/\[__ASSIGNMENTS__\]/, assignments);
      }
  
      // DECLARATIONS
      declarations += declarationTemplate.replace(/\[__VAR_NAME__\]/g, "$_patternName").replace(/\[__VAR_TYPE__\]/g, "string").replace(/\[__DEFAULT_VALUE__\]/g, "'@patternlab/atoms-" + patternName + ".twig'").replace(/\[__VAR_COMMENT__\]/g, "");
      declarations += generateVariableDeclarationsPhp(variables, declarationTemplate);
  
      // FUNCTIONS
      functions += generateFunctionDeclarationsPhp(variables, getterTemplate, setterTemplate);
  
      // CONSTRUCTOR
      constructor += generateConstructor(variables, constructorParameter);
  
      // GET JSON
      asJson += generateGetJsonPhp(variables, asJsonTemplate, asJsonAssignmentTemplate);
  
      // NAMESPACE
      phpContent = phpContent.replace(/\[__NAMESPACE__\]/, options.namespace ? "namespace " + options.namespace +";" : "");
  
      // ENUMS
      enums += generateEnums(enumSettings); 
  
      // CLASS CONTENT
      classContent = classContent.replace(/\[__CLASSNAME__\]/, stringToUpperCamelCase(patternType) + stringToUpperCamelCase(patternName));
      classContent = classContent.replace(/\[__DECLARATIONS__\]/, declarations);
      classContent = classContent.replace(/\[__CONSTRUCTOR__\]/, constructor);
      classContent = classContent.replace(/\[__FUNCTIONS__\]/, functions);
      classContent = classContent.replace(/\[__GET_JSON__\]/, asJson);
      phpContent = phpContent.replace(/\[__CLASS__\]/, classContent).replace(/\[__ENUMS__\]/,enums);
  
      return phpContent;
    }
  
    function convertTwigToPhp(patternType, patternName, twigContent) {
      var variables = parseVariableSettings(twigContent) || [],
          enumSettings = parseEnumSettings(twigContent) || [],
          constructorParameter = parseConstructorSettings(twigContent) || [],
          phpControllerContent = generatePhp(patternName, patternType, variables, constructorParameter, enumSettings);
   
      return phpControllerContent;
    }
  
    return through.obj(function (vinylFile, encoding, callback) {
      var transformedFile = vinylFile.clone(),
          patternType = transformedFile.base.match(/([^\/\\0-9\-]*)[\/\\]*$/)[1],
          basename = transformedFile.basename.split("@")[0],
          extname = ".php",
          relativePath = stringToCamelCase([patternType, basename].join("-")) + extname,
          content = transformedFile.contents.toString();
  
      transformedFile.basename = basename;
      transformedFile.contents = new Buffer(convertTwigToPhp(patternType, basename, content));
      transformedFile.extname = extname;
      transformedFile.path = transformedFile.base + "/" + relativePath;
  
      callback(null, transformedFile);
    });
}

module.exports = patternControllerGenerator;