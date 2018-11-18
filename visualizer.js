var app = angular.module('myApp', []);
app.controller('myCtrl',
function($scope, $http) {
	$http({
		method: 'GET',
		url: '/bug_history/'
	}).then(function successCallback(response) {
		// 收到结果
		parseHtml(response.data);
	},
	function errorCallback(response) {
		// 请求失败执行代码
		console.log("Get Fails");
	});

	// 代码编辑器的初始化
	$scope.editor = ace.edit('editor');
	$scope.editor.getSession().setMode('ace/mode/c_cpp');
	$scope.editor.setTheme('ace/theme/monokai');
	$scope.editor.setHighlightActiveLine(true);
	$scope.editor.$blockScrolling = Infinity;
	$scope.editor.setReadOnly(true);
	document.getElementById('editor').style.fontSize = '14px';
	
	// 变量初始化
	$scope.is_full = 0;
	$scope.history_list = []; // 所有历史提交的名称
	$scope.hlIndex = -1; // 当前选定的历史提交
	$scope.hlIndex4 = -1; // 当前选定的trace
	$scope.curr_route = []; // 当前项目路径
	$scope.bugs = []; // 当前的BUG
	$scope.traces = []; // 当前的反例路径
	$scope.currFile = [];
	$scope.currLine = 0;
	$scope.orderCond = '';
	$scope.orderCondSelect = '';
	$scope.currTheme = 'monokai';
	$scope.currCodeTheme = 'monokai'; 
	$scope.searchword = '';
	$scope.fromLargeToSmall = 1;
	$scope.showAllFiles = false;
	$scope.ctCode = [];
	$scope.openFilenames = [];
	$scope.codeDic = {}; // 代码映射字典，Map<filepath, [filename, code]>
	$scope.currTab = '';
	$scope.fontsizes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
	$scope.themes = ["ambiance", "gruvbox", "sqlserver", "chaos", "idle_fingers", "terminal", "chrome", "iplastic", "textmate", "clouds", "katzenmilch", "tomorrow", "clouds_midnight", "kr_theme", "tomorrow_night", "cobalt", "kuroir", "tomorrow_night_blue", "crimson_editor", "merbivore", "tomorrow_night_bright", "dawn", "merbivore_soft", "tomorrow_night_eighties", "dracula", "mono_industrial", "twilight", "dreamweaver", "monokai", "vibrant_ink", "eclipse", "pastel_on_dark", "xcode", "github", "solarized_dark", "gob", "solarized_light"];

	$scope.currFs = 14; // 当前选择字体大小
	$scope.currCodeFs = 14;
	$scope.fullscreenIcon = 'lib/full.png';
	$scope.cwe_desc = {
		"121": "Stack-based Buffer Overflow. A stack-based buffer overflow condition is a condition where the buffer being overwritten is allocated on the stack (i.e., is a local variable or, rarely, a parameter to a function).",
		"122": "Heap-based Buffer Overflow. A heap overflow condition is a buffer overflow, where the buffer that can be overwritten is allocated in the heap portion of memory, generally meaning that the buffer was allocated using a routine such as malloc().",
		"124": "Buffer Underflow. The software writes to a buffer using an index or pointer that references a memory location prior to the beginning of the buffer.",
		"126": "Buffer Over-read. The software reads from a buffer using buffer access mechanisms such as indexes or pointers that reference memory locations after the targeted buffer.",
		"127": "Buffer Under-read. The software reads from a buffer using buffer access mechanisms such as indexes or pointers that reference memory locations prior to the targeted buffer.",
		"190": "Integer Overflow. The software performs a calculation that can produce an integer overflow or wraparound, when the logic assumes that the resulting value will always be larger than the original value. This can introduce other weaknesses when the calculation is used for resource management or execution control.",
		"191": "Integer Underflow. The product subtracts one value from another, such that the result is less than the minimum allowable integer value, which produces a value that is not equal to the correct result.",
		"195": "Signed to Unsigned Conversion Error. The software uses a signed primitive and performs a cast to an unsigned primitive, which can produce an unexpected value if the value of the signed primitive can not be represented using an unsigned primitive.",
		"196": "Unsigned to Signed Conversion Error. The software uses an unsigned primitive and performs a cast to a signed primitive, which can produce an unexpected value if the value of the unsigned primitive can not be represented using a signed primitive.",
		"369": "Divide By Zero. The product divides a value by zero.",
		"401": "Memory Leak. The software does not sufficiently track and release allocated memory after it has been used, which slowly consumes remaining memory.",
		"404": "Improper Resource Shutdown or Release. The program does not release or incorrectly releases a resource before it is made available for re-use.",
		"415": "Double Free. The product calls free() twice on the same memory address, potentially leading to modification of unexpected memory locations.",
		"416": "Use After Free. Referencing memory after it has been freed can cause a program to crash, use unexpected values, or execute code.",
		"457": "Use of Uninitialized Variable. The code uses a variable that has not been initialized, leading to unpredictable or unintended results.",
		"476": "NULL Pointer Dereference. A NULL pointer dereference occurs when the application dereferences a pointer that it expects to be valid, but is NULL, typically causing a crash or exit.",
		"561": "Dead Code. The software contains dead code, which can never be executed.",
		"562": "Return of Stack Variable Address. A function returns the address of a stack variable, which will cause unintended program behavior, typically in the form of a crash.",
		"563": "Unused Variable. The variable's value is assigned but never used, making it a dead store.",
		"570": "Expression Always False. The software contains an expression that will always evaluate to false.",
		"571": "Expression Always True. The software contains an expression that will always evaluate to true.",
		"690": "Unchecked Return Value to NULL Pointer Dereference. The product does not check for an error after calling a function that can return with a NULL pointer if the function fails, which leads to a resultant NULL pointer dereference.",
		"775": "Missing Release of File Descriptor or Hanle after Effective Lifetime. The software does not release a file descriptor or handle after its effective lifetime has ended, i.e., after the file descriptor/handle is no longer needed."
	};

	$scope.changeHL = function(hlIndex) {
		if (hlIndex < 0) return;
		// console.log(hlIndex);
		$scope.hlIndex = hlIndex;
		$scope.hlIndex4 = -1;
		$scope.curr_route = [];
		$scope.bugs = [];
		$scope.traces = [];
		$scope.curr_route.push($scope.history_list[hlIndex]);
		getProj($scope.history_list[hlIndex]);
		getBug($scope.history_list[hlIndex]);
	};

	$scope.changeOrderCond = function(newCond) {
		if ($scope.orderCond == newCond) {
			$scope.orderCond = "-" + $scope.orderCond;
		} else {
			$scope.orderCond = newCond;
		}
		$scope.orderCondSelect = newCond;
	};

	$scope.bugClick = function(bug) {
		for (var i = 0; i < $scope.bugs.length; i++) $scope.bugs[i].isSelected = 0;
		bug.isSelected = 1;
		$scope.hlIndex4 = -1;
		$scope.traces = [];
		var traces = bug.traces;
		// counter trace : origin code
		$scope.ctCode = [];
		for (var i = 0; i < traces.length; i++) {
			$scope.ctCode.push("");
			if (traces[i].length >= 3) $scope.traces.push({
				file: traces[i][0],
				line: traces[i][1],
				hint: traces[i][2]
			});
			else $scope.traces.push({
				file: traces[i][0],
				line: traces[i][1],
				hint: ""
			});
			getCodeLine(traces[i][0], traces[i][1], i);
		}
	};

	$scope.cweclick = function(cweid, desc) {
		$scope.cwe_id = cweid;
		$scope.showCWE = 1;
	};

	$scope.selectFs = function(fsid) {
		$scope.currFs = $scope.fontsizes[fsid];
	};

	$scope.traceClick = function(hlIndex4) {
		$scope.hlIndex4 = hlIndex4;
		$scope.currFile = $scope.traces[hlIndex4].file.split("/");
		$scope.currLine = $scope.traces[hlIndex4].line - 1;
		$scope.curr_route = [];
		$scope.curr_route.push($scope.history_list[$scope.hlIndex]);
		for (var i = 0; i < $scope.currFile.length - 1; i++) $scope.curr_route.push($scope.currFile[i]);
		var file_route = "/bug_history/" + $scope.history_list[$scope.hlIndex] + "/" + $scope.traces[hlIndex4].file;
		$http({
			method: 'GET',
			url: file_route
		}).then(function successCallback(response) {
			// 收到结果
			$scope.editor.setValue(response.data);
			$scope.editor.gotoLine($scope.currLine);
			$scope.editor.navigateTo($scope.currLine, 0);
			$scope.addAnnotations(file_route);
		},
		function errorCallback(response) {
			// 请求失败执行代码
			console.log("Get Fails");
		});
		var treeObj = $.fn.zTree.getZTreeObj("tree");
		var tmpNodes = treeObj.getNodes()[0].children;
		var fileName = $scope.currFile[$scope.currFile.length - 1];
		var TId = "";
		for (var i = 0; i < $scope.currFile.length - 1; i++) {
			for (var j = 0; j < tmpNodes.length; j++) {
				if (tmpNodes[j].name == $scope.currFile[i] && tmpNodes[j].isParent) {
					tmpNodes = tmpNodes[j].children;
					break;
				}
			}
		}
		for (var j = 0; j < tmpNodes.length; j++) {
			if (tmpNodes[j].name == fileName && !tmpNodes[j].isParent) {
				TId = tmpNodes[j].tId;
				break;
			}
		}
		var node = treeObj.getNodeByTId(TId);
		if (node) {
			treeObj.selectNode(node);
		}
	};

	$scope.addAnnotations = function(file_route) {
		var annotation_data = []
		for (var i = 0; i < $scope.traces.length; i += 1) {
			if (file_route.indexOf($scope.traces[i].file) < 0) {
				continue;
			}
			annotation_data.push({
				row: $scope.traces[i].line - 1,
				column: 0,
				text: $scope.traces[i].hint,
				type: "error",
			});
			$scope.editor.getSession().setAnnotations(annotation_data);
		}
	};

	$scope.toggleFullScreen = function() {
		if ($scope.is_full == 0) {
			// 平移左右的模块
			$('#right-panel').hide();
			$('#left-panel').animate({
				'width': '0%'
			},
			500);
			$('.left-panel-content').hide();
			$('#middle-panel').animate({
				'width': '100%'
			},
			500);
			$scope.is_full = 1;
			$scope.fullscreenIcon = 'lib/full_exit.png';
		} else {
			// 缩回来
			$('#middle-panel').animate({
				'width': '50%'
			},
			300,
			function() {
				$('#right-panel').fadeIn(200);
				$('.left-panel-content').fadeIn(200);
			});
			$('#left-panel').animate({
				'width': '16.666667%'
			},
			500);
			$scope.is_full = 0;
			$scope.fullscreenIcon = 'lib/full.png';
		}
	};

	$scope.openSetting = function() {
		$('.modal-unity').fadeIn(500);
	};

	$scope.closeSetting = function() {
		$('.modal-unity').fadeOut(500,
		function() {
			$scope.currFs = $scope.currCodeFs;
			$scope.currTheme = $scope.currCodeTheme;
		});
	};

	$scope.saveSetting = function() {
		$scope.currCodeFs = $scope.currFs;
		document.getElementById('editor').style.fontSize = $scope.currCodeFs + 'px';
		$scope.editor.setTheme('ace/theme/'+ $scope.currTheme);
		$('.modal-unity').fadeOut(500);
	};

	$scope.selectTheme = function() {
		$scope.currCodeTheme = $scope.currTheme;
	};

	$scope.changeTab = function(filename){
		$scope.currTab = filename;
		var code_data = $scope.codeDic[filename][1];
		$scope.editor.setValue(code_data);
		$scope.editor.navigateTo(0, 0);
	};

	$scope.openfile = function(filepath, filename, codedata){
		$scope.currTab = filepath;
		if($.inArray(filepath, $scope.openFilenames) < 0){
			$scope.openFilenames.push(filepath);
			$scope.codeDic[filepath] = [filename, codedata];
		}
	};

	$scope.closeTab = function(filepath){
		var tempOpenFilenames = [];
		for(var i = 0; i < $scope.openFilenames.length; i++){
			if ($scope.openFilenames[i] != filepath){
				tempOpenFilenames.push($scope.openFilenames[i]);
			}
		}
		$scope.openFilenames = tempOpenFilenames;
		if ($scope.currTab){
			if ($scope.openFilenames.length > 0){
				$scope.openfile($scope.openFilenames[0]);
			}
			else{
				$scope.editor.setValue("");
			}
		}
	};

	// 文件树
	var zTreeOnClick = function(event, treeId, treeNode) {
		var currNode = treeNode;
		if (!treeNode.isParent) {
			var root_arr = [];
			for (var i = treeNode.level; i >= 1; i--) {
				root_arr.push(treeNode.name);
				treeNode = treeNode.getParentNode();
			}
			var file_route = "/bug_history/" + $scope.history_list[$scope.hlIndex];
			while (root_arr.length > 0) {
				file_route += "/" + root_arr.pop();
			}
			$http({
				method: 'GET',
				url: file_route
			}).then(function successCallback(response) {
				// 收到结果
				$scope.editor.setValue(response.data);
				$scope.editor.navigateTo(0, 0);
				$scope.openfile(file_route, currNode.name, response.data);
			},
			function errorCallback(response) {
				// 请求失败执行代码
				console.log("Get Fails");
			});
		}
	};

	// 代码行获取
	var getCodeLine = function(file_name, line_number, index_number) {
		var file_route = "/bug_history/" + $scope.history_list[$scope.hlIndex] + "/" + file_name;
		$http({
			method: 'GET',
			url: file_route
		}).then(function(response) {
			// 收到结果
			var resp = response.data;
			line_code = $.trim(resp.split('\n')[line_number - 1]);
			if (line_code.length > 30) {
				line_code = line_code.substring(0, 30) + "...";
			}
			console.log(line_code);
			$scope.ctCode[index_number] = line_code;
		});
	};

	var getProj = function(hl_name) {
		var proj_route = "/bug_history/" + hl_name + "/proj_data.json";
		$http({
			method: 'GET',
			url: proj_route
		}).then(function successCallback(response) {
			// 收到结果
			parseProj(response.data);
		},
		function errorCallback(response) {
			// 请求失败执行代码
			console.log("Get Fails");
		});
	};

	var getBug = function(his_name) {
		var xml_route = "/bug_history/" + his_name + ".xml/data.json";
		$http({
			method: 'GET',
			url: xml_route
		}).then(function successCallback(response) {
			// 收到结果
			parseBug(response.data);
		},
		function errorCallback(response) {
			// 请求失败执行代码
			console.log("Get Fails");
		});
	};

	// 处理获得的bug_history文件夹下的结果
	var parseHtml = function(data) {
		// 获得项目文件夹列表
		var reFolder = new RegExp('<span style="background-color: #CEFFCE;">(.*?)/</span>');
		var folder_split = data.split(reFolder);
		var folder_list = [];
		for (var i = 0; i < folder_split.length; i++) {
			if (i % 2 == 1) folder_list.push(folder_split[i]);
		}

		// 获得xml文件夹列表
		var reXML = new RegExp('<span style="background-color: #CEFFCE;">(.*?)\.xml/</span>');
		var XML_split = data.split(reXML);
		var xml_list = [];
		for (var i = 0; i < XML_split.length; i++) {
			if (i % 2 == 1) xml_list.push(XML_split[i]);
		}

		// 获得项目文件夹与xml文件名对应的列表
		for (var folder_list_a in folder_list) {
			tmpName = folder_list[folder_list_a];
			if (xml_list.indexOf(tmpName) >= 0) $scope.history_list.push(tmpName);
		}
	};

	// node排序的比较函数
	var compareNodeName = function (x, y) {
		if (('isParent' in x) && !('isParent' in y)) {
			return -1;
		} 
		else if (('isParent' in y) && !('isParent' in x)) {
			return 1;
		}
		else {
			if (x['name'] > y['name']){
				return 1;
			}
			return -1;
		}
	};

	// 过滤文件树，只保留c i h三类文件
	var filterfile = function(data, showAllFiles) {
		var result = [];
		for (var i = 0; i < data.length; i++) {
			if ('children' in data[i]) {
				var tempChildren = filterfile(data[i]['children'], showAllFiles);
				var tempResult = data[i];
				tempResult['children'] = tempChildren.sort(compareNodeName);
				result.push(tempResult);
			} 
			else if (showAllFiles || ([".c", ".i", ".h"].indexOf(data[i]['name'].substring(data[i]['name'].length - 2)) >= 0)) {
				result.push(data[i]);
			}
		}
		return result;
	};

	// 处理获得路径文件夹下的结果
	var parseProj = function(data) {
		var setting = {
			view: {
				selectedMulti: false
			},
			data: {
				simpleData: {
					enable: true
				}
			},
			callback: {
				onClick: zTreeOnClick
			}
		};
		$scope.zNodes = filterfile(data, $scope.showAllFiles);
		// if ($scope.showAllFiles) {
		// 	$scope.zNodes = data;
		// } else {
		// 	$scope.zNodes = filterfile(data);
		// }
		$.fn.zTree.init($("#tree"), setting, $scope.zNodes);
	};

	// 处理获得路径文件夹下的xml的结果
	var parseBug = function(data) {
		$scope.bugs = data;
		for (var i = 0; i < data.length; i++) {
			$scope.bugs[i]['temp_id'] = i + 1;
		}
	}
});