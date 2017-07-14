define ['knockout', 'ko/mapping', 'jquery'], (ko, kom, $) ->

	###
	# Stores a field value in sessionStorage, if available.
	# Usage:
	#
	#     field = ko.observable(0).extend({ session: 'local-field' })
	#     field = ko.observable(0).extend({ session: {
	#         name: 'local-field',
	#         storage: ko.extenders.session.sessionStorage,
	#         serialize: ko.mapping.toJSON,
	#         deserialize: ko.mapping.fromJSON,
	#         version: 0
	#         mappingOptions: {}
	#     }})
	#
	# An object will only be deserialized when the value of 'version'
	# matches the version of the serialized value.
	#
	# Important: Ensure that your target object CAN be mapped. Predefined
	# functions or computed on the root object will not be replaced on
	# deserializing, but if your targets value has functions or computed's
	# on the second level or lower (child object or array value) you will
	# want to define 'mappingOptions' with adequate values. See: 
	# http://knockoutjs.com/documentation/plugins-mapping.html
	#
	# To prevent fatal exceptions in private browsing mode and when used
	# within iframes you should not access window.localStorage and window.sessionStorage
	# directly but ko.extenders.session.localStorage and ko.extenders.session.sessionStorage
	# instead. These will replaced by dummy implementations when the
	# normal storage object is not available.
	#
	# Author: Roland Tapken <roland.tapken@rasch.de>
	###
	

	VERSION_SUFFIX = '__VERSION__'

	ko.extenders.session = (target, options) ->
		if typeof options == 'string' or options instanceof String
			options = { name: options }
		if not options.name
			throw 'A session extender must have a name'
		if not options.serialize
			options.serialize = kom.toJSON
		if not options.deserialize
			options.deserialize = kom.fromJSON
		if not options.mappingOptions
			options.mappingOptions = {}
		if not options.storage
			options.storage = ko.extenders.session.sessionStorage
		if options.mapping == undefined
			options.mapping = true
		if options.version == undefined
			options.version = 0

		window.setTimeout((() ->
			# Don't do anything here that might observe target().
			# This would lead to bad side effects.

			value = target()
			initialValue = options.serialize(value)
			serializedValue = options.storage.getItem(options.name)
			if serializedValue != undefined and serializedValue != null and serializedValue != 'null'
				# Check version
				serializedVersion = parseInt(options.storage.getItem(options.name + VERSION_SUFFIX) || '0')
				if serializedVersion == options.version
					if options.mapping
						mappingOptions = $.extend({ ignore: [], copy: [] }, options.mappingOptions)
						for k, v of value
							if $.isFunction(v)
								# Don't deserialize plain functions or computed
								if not ko.isObservable(v) or ko.isComputed(v)
									mappingOptions.ignore.push(k)
							else
								# Just copy fields that were not observable before
								mappingOptions.copy.push(k)

						try
							options.deserialize(serializedValue, mappingOptions, target)
						catch e
							console.log "Error while deserializing value for " + options.name, e, serializedValue
					else
						try
							target(JSON.parse(serializedValue))
						catch e
							console.log e

			ko.computed(() ->
				value = options.serialize(target())
				if value != initialValue
					options.storage.setItem(options.name, value)
					options.storage.setItem(options.name + VERSION_SUFFIX, options.version)
				else
					options.storage.setItem(options.name, null)
					options.storage.setItem(options.name + VERSION_SUFFIX, null)
			)

			# Remove object from session.
			target.clearSession = () ->
				options.storage.setItem(options.name, null)
		), 10)

		return target
	
	# Override localStorage and sessionStorage with dummies if not available.
	# Storage is not available in Private Browsing mode and in iFrame mode.
	DummyStorage = class
		constructor: () ->
			@_values = {}

		setItem: (name, value) ->
			@_values[name] = value

		getItem: (name) ->
			return @_values[name]

		removeItem: (name) ->
			delete @_values[name]

		clear: () ->
			@_values = {}

	try
		if window.localStorage
			window.localStorage.setItem('test', '1')
			window.localStorage.removeItem('test')
			ko.extenders.session.localStorage = window.localStorage
		else
			console.log "LocalStorage not available", error
			ko.extenders.session.localStorage = new DummyStorage()
	catch error
		console.log "Disabling LocalStorage", error
		ko.extenders.session.localStorage = new DummyStorage()
	
	try
		if window.sessionStorage
			window.sessionStorage.setItem('test', '1')
			window.sessionStorage.removeItem('test')
			ko.extenders.session.sessionStorage = window.sessionStorage
		else
			console.log "LocalStorage not available", error
			ko.extenders.session.sessionStorage = new DummyStorage()
	catch error
		console.log "Disabling SessionStorage", error
		ko.extenders.session.sessionStorage = new DummyStorage()
		return ko.extenders.session


#  vim: set fenc=utf-8 ts=4 sw=4 noet :
