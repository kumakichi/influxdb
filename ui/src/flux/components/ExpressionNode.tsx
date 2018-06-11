import React, {PureComponent} from 'react'

import {FluxContext} from 'src/flux/containers/FluxPage'
import FuncSelector from 'src/flux/components/FuncSelector'
import FuncNode from 'src/flux/components/FuncNode'
import YieldFuncNode from 'src/flux/components/YieldFuncNode'

import {Func} from 'src/types/flux'

interface Props {
  funcNames: any[]
  bodyID: string
  funcs: Func[]
  declarationID?: string
  declarationsFromBody: string[]
  isLastBody: boolean
}

// an Expression is a group of one or more functions
class ExpressionNode extends PureComponent<Props> {
  public render() {
    const {
      declarationID,
      bodyID,
      funcNames,
      funcs,
      declarationsFromBody,
    } = this.props

    return (
      <FluxContext.Consumer>
        {({
          onDeleteFuncNode,
          onAddNode,
          onChangeArg,
          onGenerateScript,
          onToggleYield,
          service,
          data,
          scriptUpToYield,
        }) => {
          return (
            <>
              {funcs.map((func, i) => {
                if (func.name === 'yield') {
                  const script = scriptUpToYield(bodyID, declarationID, i)

                  return (
                    <YieldFuncNode
                      index={i}
                      key={i}
                      func={func}
                      data={data}
                      script={script}
                      bodyID={bodyID}
                      service={service}
                      declarationID={declarationID}
                    />
                  )
                }
                return (
                  <FuncNode
                    key={i}
                    index={i}
                    func={func}
                    bodyID={bodyID}
                    service={service}
                    onChangeArg={onChangeArg}
                    onDelete={onDeleteFuncNode}
                    onToggleYield={onToggleYield}
                    isYielding={this.isNextFuncYield(i)}
                    declarationID={declarationID}
                    onGenerateScript={onGenerateScript}
                    declarationsFromBody={declarationsFromBody}
                  />
                )
              })}
              <FuncSelector
                bodyID={bodyID}
                funcs={funcNames}
                onAddNode={onAddNode}
                declarationID={declarationID}
              />
            </>
          )
        }}
      </FluxContext.Consumer>
    )
  }

  private isNextFuncYield = (funcIndex: number): boolean => {
    const {funcs, isLastBody} = this.props

    if (funcIndex === funcs.length - 1 && isLastBody) {
      return true
    }

    if (funcIndex === funcs.length - 1) {
      return false
    }

    const nextFunc = funcs[funcIndex + 1]

    if (nextFunc.name === 'yield') {
      return true
    }

    return false
  }
}

export default ExpressionNode
