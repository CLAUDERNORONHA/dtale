import _ from "lodash";
import PropTypes from "prop-types";
import React from "react";
import { withTranslation } from "react-i18next";
import { connect } from "react-redux";

import * as gu from "../gridUtils";
import serverState from "../serverStateManagement";
import { openChart } from "../../actions/charts";
import { getCell } from "../gridUtils";

require("./EditedCellInfo.scss");

function buildState(props) {
  const { editedCell, gridState } = props;
  if (editedCell === null) {
    return { value: null, rowIndex: null, colCfg: null, origValue: null };
  }
  const { rec, colCfg, rowIndex } = getCell(editedCell, gridState);
  return { value: rec.raw, rowIndex, colCfg, origValue: rec.raw };
}

class ReactEditedCellInfo extends React.Component {
  constructor(props) {
    super(props);
    this.state = buildState(props);
    this.input = React.createRef();
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidMount() {
    this.input.current?.addEventListener("keydown", this.onKeyDown);
  }

  componentWillUnmount() {
    this.input.current?.removeEventListener("keydown", this.onKeyDown);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.editedCell !== this.props.editedCell) {
      this.setState(buildState(this.props));
    }
    if (this.state.origValue && this.state.origValue !== prevState.origValue) {
      const ref = this.input.current;
      ref.style.height = "0px";
      ref.style.height = `${ref.scrollHeight}px`;
      this.props.updateHeight(ref.scrollHeight + 10);
    }
  }

  onKeyDown(e) {
    if (e.key === "Enter") {
      const { colCfg, rowIndex, value, origValue } = this.state;
      const { gridState, propagateState, dataId, settings, maxColumnWidth } = this.props;
      if (value === origValue) {
        this.props.clearEdit();
        return;
      }
      const { data, columns, columnFormats } = gridState;
      const callback = editData => {
        if (editData.error) {
          this.props.openChart({ ...editData, type: "error" });
          return;
        }
        const updatedData = _.cloneDeep(data);
        updatedData[rowIndex - 1][colCfg.name] = gu.buildDataProps(colCfg, this.state.value, {
          columnFormats,
          settings,
        });
        const width = gu.calcColWidth(colCfg, {
          ...gridState,
          ...settings,
          maxColumnWidth,
        });
        const updatedColumns = _.map(columns, c => ({
          ...c,
          ...(c.name === colCfg.name ? width : {}),
        }));
        propagateState({ columns: updatedColumns, data: updatedData, triggerResize: true }, this.props.clearEdit);
      };
      serverState.editCell(dataId, colCfg.name, rowIndex - 1, this.state.value, callback);
    } else if (e.key === "Escape") {
      this.props.clearEdit();
    }
  }

  render() {
    const { editedCell } = this.props;
    return (
      <>
        <div className={`row text-center edited-cell-info${editedCell ? " is-expanded" : ""}`}>
          <div className="col-md-12">
            <textarea
              ref={this.input}
              style={{ width: "inherit" }}
              value={this.state.value ?? ""}
              onChange={e => this.setState({ value: e.target.value })}
            />
          </div>
        </div>
      </>
    );
  }
}
ReactEditedCellInfo.displayName = "EditedCellInfo";
ReactEditedCellInfo.propTypes = {
  editedCell: PropTypes.string,
  propagateState: PropTypes.func,
  columns: PropTypes.arrayOf(PropTypes.object),
  dataId: PropTypes.string,
  gridState: PropTypes.shape({
    data: PropTypes.object,
    columns: PropTypes.arrayOf(PropTypes.object),
    sortInfo: PropTypes.arrayOf(PropTypes.array),
    columnFormats: PropTypes.object,
  }),
  openChart: PropTypes.func,
  clearEdit: PropTypes.func,
  settings: PropTypes.object,
  maxColumnWidth: PropTypes.number,
  updateHeight: PropTypes.func,
};
const TranslateEditedCellInfo = withTranslation("main")(ReactEditedCellInfo);
const ReduxEditedCellInfo = connect(
  ({ dataId, editedCell, settings, maxColumnWidth }) => ({
    dataId,
    editedCell,
    settings,
    maxColumnWidth,
  }),
  dispatch => ({
    openChart: chartProps => dispatch(openChart(chartProps)),
    clearEdit: () => dispatch({ type: "clear-edit" }),
    updateHeight: height => dispatch({ type: "edited-cell-textarea-height", height }),
  })
)(TranslateEditedCellInfo);
export { ReduxEditedCellInfo as EditedCellInfo, TranslateEditedCellInfo as ReactEditedCellInfo };
