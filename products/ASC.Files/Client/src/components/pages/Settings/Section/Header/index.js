import React from "react";
import Headline from "@appserver/common/components/Headline";

const SectionHeaderContent = ({ title }) => {
  return (
    <Headline className="headline-header" type="content" truncate={true}>
      {title}
    </Headline>
  );
};

export default SectionHeaderContent;
