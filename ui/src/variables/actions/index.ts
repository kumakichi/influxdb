// API
import {client} from 'src/utils/api'
import {hydrateVars} from 'src/variables/utils/hydrateVars'

// Actions
import {notify} from 'src/shared/actions/notifications'
import {
  getVariablesFailed,
  getVariableFailed,
  createVariableFailed,
  updateVariableFailed,
  deleteVariableFailed,
  deleteVariableSuccess,
  createVariableSuccess,
  updateVariableSuccess,
} from 'src/shared/copy/notifications'
import {setExportTemplate} from 'src/templates/actions'

// APIs
import {createVariableFromTemplate as createVariableFromTemplateAJAX} from 'src/templates/api'
import * as api from 'src/client'
// Utils
import {getValueSelections, extractVariablesList} from 'src/variables/selectors'
import {CancelBox} from 'src/types/promises'
import {variableToTemplate} from 'src/shared/utils/resourceToTemplate'
import {findDepedentVariables} from 'src/variables/utils/exportVariables'

// Constants
import * as copy from 'src/shared/copy/notifications'

// Types
import {Dispatch} from 'redux-thunk'
import {
  RemoteDataState,
  VariableTemplate,
  QueryArguments,
  MapArguments,
  CSVArguments,
  GetState,
  VariableArgumentType,
} from 'src/types'
import {Label, Variable} from 'src/client'
import {VariableValuesByID} from 'src/variables/types'
import {
  addVariableLabelFailed,
  removeVariableLabelFailed,
} from 'src/shared/copy/notifications'

export type EditorAction =
  | ReturnType<typeof clearEditor>
  | ReturnType<typeof updateType>
  | ReturnType<typeof updateName>
  | ReturnType<typeof updateQuery>
  | ReturnType<typeof updateMap>
  | ReturnType<typeof updateConstant>

export const clearEditor = () => ({
  type: 'CLEAR_VARIABLE_EDITOR' as 'CLEAR_VARIABLE_EDITOR',
})

export const updateType = (type: VariableArgumentType) => ({
  type: 'CHANGE_VARIABLE_EDITOR_TYPE' as 'CHANGE_VARIABLE_EDITOR_TYPE',
  payload: type,
})

export const updateName = (name: string) => ({
  type: 'UPDATE_VARIABLE_EDITOR_NAME' as 'UPDATE_VARIABLE_EDITOR_NAME',
  payload: name,
})

export const updateQuery = (arg: QueryArguments) => ({
  type: 'UPDATE_VARIABLE_EDITOR_QUERY' as 'UPDATE_VARIABLE_EDITOR_QUERY',
  payload: arg,
})

export const updateMap = (arg: MapArguments) => ({
  type: 'UPDATE_VARIABLE_EDITOR_MAP' as 'UPDATE_VARIABLE_EDITOR_MAP',
  payload: arg,
})

export const updateConstant = (arg: CSVArguments) => ({
  type: 'UPDATE_VARIABLE_EDITOR_CONSTANT' as 'UPDATE_VARIABLE_EDITOR_CONSTANT',
  payload: arg,
})

export type Action =
  | ReturnType<typeof setVariables>
  | ReturnType<typeof setVariable>
  | ReturnType<typeof removeVariable>
  | ReturnType<typeof moveVariable>
  | ReturnType<typeof setValues>
  | ReturnType<typeof selectValue>

const setVariables = (status: RemoteDataState, variables?: Variable[]) => ({
  type: 'SET_VARIABLES' as 'SET_VARIABLES',
  payload: {status, variables},
})

const setVariable = (
  id: string,
  status: RemoteDataState,
  variable?: Variable
) => ({
  type: 'SET_VARIABLE' as 'SET_VARIABLE',
  payload: {id, status, variable},
})

const removeVariable = (id: string) => ({
  type: 'REMOVE_VARIABLE' as 'REMOVE_VARIABLE',
  payload: {id},
})

export const moveVariable = (
  originalIndex: number,
  newIndex: number,
  contextID: string
) => ({
  type: 'MOVE_VARIABLE' as 'MOVE_VARIABLE',
  payload: {originalIndex, newIndex, contextID},
})

export const setValues = (
  contextID: string,
  status: RemoteDataState,
  values?: VariableValuesByID
) => ({
  type: 'SET_VARIABLE_VALUES' as 'SET_VARIABLE_VALUES',
  payload: {contextID, status, values},
})

export const selectValue = (
  contextID: string,
  variableID: string,
  selectedValue: string
) => ({
  type: 'SELECT_VARIABLE_VALUE' as 'SELECT_VARIABLE_VALUE',
  payload: {contextID, variableID, selectedValue},
})

export const getVariables = () => async (
  dispatch: Dispatch<Action>,
  getState: GetState
) => {
  try {
    dispatch(setVariables(RemoteDataState.Loading))
    const {
      orgs: {org},
    } = getState()
    const resp = await api.getVariables({query: {orgID: org.id}})
    if (resp.status !== 200) {
      throw new Error("Couldn't retreive variables for this organization")
    }

    dispatch(setVariables(RemoteDataState.Done, resp.data.variables))
  } catch (e) {
    console.error(e)
    dispatch(setVariables(RemoteDataState.Error))
    dispatch(notify(getVariablesFailed()))
  }
}

export const getVariable = (id: string) => async (
  dispatch: Dispatch<Action>
) => {
  try {
    dispatch(setVariable(id, RemoteDataState.Loading))

    const resp = await api.getVariable({variableID: id})
    if (resp.status !== 200) {
      throw new Error("Couldn't retrieve variable based on the ID")
    }

    dispatch(setVariable(id, RemoteDataState.Done, resp.data))
  } catch (e) {
    console.error(e)
    dispatch(setVariable(id, RemoteDataState.Error))
    dispatch(notify(getVariableFailed()))
  }
}

export const createVariable = (
  variable: Pick<Variable, 'name' | 'arguments'>
) => async (dispatch: Dispatch<Action>, getState: GetState) => {
  try {
    const {
      orgs: {org},
    } = getState()
    const resp = await api.postVariable({
      data: {
        ...variable,
        orgID: org.id,
      },
    })

    if (resp.status !== 201) {
      throw new Error('Failed to create variable from template')
    }

    dispatch(setVariable(resp.data.id, RemoteDataState.Done, resp.data))
    dispatch(notify(createVariableSuccess(variable.name)))
  } catch (e) {
    console.error(e)
    dispatch(notify(createVariableFailed(e.response.data.message)))
  }
}

export const createVariableFromTemplate = (
  template: VariableTemplate
) => async (dispatch: Dispatch<Action>, getState: GetState) => {
  try {
    const {
      orgs: {org},
    } = getState()
    const createdVariable = await createVariableFromTemplateAJAX(
      template,
      org.id
    )

    dispatch(
      setVariable(createdVariable.id, RemoteDataState.Done, createdVariable)
    )
    dispatch(notify(createVariableSuccess(createdVariable.name)))
  } catch (e) {
    console.error(e)
    dispatch(notify(createVariableFailed(e.response.data.message)))
  }
}

export const updateVariable = (id: string, props: Variable) => async (
  dispatch: Dispatch<Action>
) => {
  try {
    dispatch(setVariable(id, RemoteDataState.Loading))

    const resp = await api.putVariable({
      variableID: id,
      data: props,
    })

    if (resp.status !== 200) {
      throw new Error('An error occurred while updating the variable')
    }

    dispatch(setVariable(id, RemoteDataState.Done, resp.data))
    dispatch(notify(updateVariableSuccess(resp.data.name)))
  } catch (e) {
    console.error(e)
    dispatch(setVariable(id, RemoteDataState.Error))
    dispatch(notify(updateVariableFailed(e.response.data.message)))
  }
}

export const deleteVariable = (id: string) => async (
  dispatch: Dispatch<Action>
) => {
  try {
    dispatch(setVariable(id, RemoteDataState.Loading))
    await client.variables.delete(id)
    dispatch(removeVariable(id))
    dispatch(notify(deleteVariableSuccess()))
  } catch (e) {
    console.error(e)
    dispatch(setVariable(id, RemoteDataState.Done))
    dispatch(notify(deleteVariableFailed(e.response.data.message)))
  }
}

interface PendingValueRequests {
  [contextID: string]: CancelBox<VariableValuesByID>
}

const pendingValueRequests: PendingValueRequests = {}

export const refreshVariableValues = (
  contextID: string,
  variables: Variable[]
) => async (dispatch: Dispatch<Action>, getState: GetState): Promise<void> => {
  dispatch(setValues(contextID, RemoteDataState.Loading))

  try {
    const {
      orgs: {org},
    } = getState()
    const url = getState().links.query.self
    const selections = getValueSelections(getState(), contextID)
    const allVariables = extractVariablesList(getState())

    if (pendingValueRequests[contextID]) {
      pendingValueRequests[contextID].cancel()
    }

    pendingValueRequests[contextID] = hydrateVars(variables, allVariables, {
      url,
      orgID: org.id,
      selections,
    })

    const values = await pendingValueRequests[contextID].promise

    dispatch(setValues(contextID, RemoteDataState.Done, values))
  } catch (e) {
    if (e.name === 'CancellationError') {
      return
    }

    console.error(e)
    dispatch(setValues(contextID, RemoteDataState.Error))
  }
}

export const convertToTemplate = (variableID: string) => async (
  dispatch,
  getState: GetState
): Promise<void> => {
  try {
    dispatch(setExportTemplate(RemoteDataState.Loading))
    const {
      orgs: {org},
    } = getState()
    const resp = await api.getVariable({variableID})

    if (resp.status !== 200) {
      throw new Error('There was an error getting the variable')
    }
    const allVariables = await api.getVariables({query: {orgID: org.id}})
    if (allVariables.status !== 200) {
      throw new Error(
        "There was an error getting this organization's variables"
      )
    }

    const dependencies = findDepedentVariables(
      resp.data,
      allVariables.data.variables
    )
    const variableTemplate = variableToTemplate(resp.data, dependencies)

    dispatch(setExportTemplate(RemoteDataState.Done, variableTemplate))
  } catch (error) {
    dispatch(setExportTemplate(RemoteDataState.Error))
    dispatch(notify(copy.createTemplateFailed(error)))
  }
}

export const addVariableLabelAsync = (
  variableID: string,
  label: Label
) => async (dispatch): Promise<void> => {
  try {
    await api.postVariablesLabel({variableID, data: {labelID: label.id}})
    const resp = await api.getVariable({variableID})

    if (resp.status !== 200) {
      throw new Error('There was an error adding the label to the variable')
    }

    dispatch(setVariable(variableID, RemoteDataState.Done, resp.data))
  } catch (error) {
    console.error(error)
    dispatch(notify(addVariableLabelFailed()))
  }
}

export const removeVariableLabelAsync = (
  variableID: string,
  label: Label
) => async (dispatch): Promise<void> => {
  try {
    await api.deleteVariablesLabel({variableID, labelID: label.id})
    const resp = await api.getVariable({variableID})

    if (resp.status !== 200) {
      throw new Error('There was an error removing the label from the variable')
    }

    dispatch(setVariable(variableID, RemoteDataState.Done, resp.data))
  } catch (error) {
    console.error(error)
    dispatch(notify(removeVariableLabelFailed()))
  }
}
